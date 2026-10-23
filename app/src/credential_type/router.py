from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.src.common.auth_dependencies import (
    CurrentUser,
    get_current_user_from_token,
    require_admin,
    require_super_admin,
)
from app.src.common.response import success_response
from app.src.blockchain.config import get_blockchain_settings
from app.src.credential.dependencies import get_db

from .registry import CredentialTypeRegistryError, get_credential_type_registry
from .repository import (
    create_credential_type,
    get_credential_type,
    list_credential_types,
    schema_hash_for_fields,
    serialize_credential_type,
    update_credential_type_chain_anchor,
)
from .schemas import CredentialTypeCreate

router = APIRouter(prefix="/credential-types", tags=["credential-types"])


@router.get("")
def list_types(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    records = list_credential_types(db)
    return success_response(
        data=[serialize_credential_type(item) for item in records],
        message="Credential types fetched successfully",
    )


@router.get("/{type_id}")
def get_type(
    type_id: str,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user_from_token),
):
    record = get_credential_type(db, type_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential type not found: {type_id}",
        )
    return success_response(
        data=serialize_credential_type(record),
        message="Credential type fetched successfully",
    )


@router.post("")
def create_type(
    payload: CredentialTypeCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_super_admin),
):
    existing = get_credential_type(db, payload.type_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Credential type already exists: {payload.type_id}",
        )

    fields = [field.model_dump(mode="json") for field in payload.fields]
    schema_hash = schema_hash_for_fields(fields)

    settings = get_blockchain_settings()
    tx_hash = None
    block_number = None

    if settings.credential_type_registry_address:
        try:
            registry = get_credential_type_registry()
            chain_result = registry.register_credential_type(
                type_id=payload.type_id,
                revocable=payload.revocable,
                schema_hash=schema_hash,
            )
            tx_hash = chain_result["tx_hash"]
            block_number = chain_result["block_number"]
        except CredentialTypeRegistryError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to register credential type on-chain: {exc}",
            )

    record = create_credential_type(
        db,
        type_id=payload.type_id,
        display_name=payload.display_name,
        description=payload.description,
        revocable=payload.revocable,
        fields=fields,
        schema_hash=schema_hash,
        created_by=current_user.user_id,
        tx_hash=tx_hash,
        block_number=block_number,
    )

    return success_response(
        data=serialize_credential_type(record),
        message="Credential type created successfully",
    )


@router.post("/{type_id}/anchor")
def anchor_existing_type(
    type_id: str,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_super_admin),
):
    """Register an already-seeded DB type on-chain if missing (bootstrap helper)."""
    record = get_credential_type(db, type_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential type not found: {type_id}",
        )

    schema_hash = record.schema_hash or schema_hash_for_fields(record.fields or [])
    try:
        registry = get_credential_type_registry()
        if registry.type_exists(type_id):
            on_chain = registry.get_type(type_id)
            updated = update_credential_type_chain_anchor(
                db,
                type_id,
                schema_hash=on_chain["schema_hash"],
                tx_hash=record.tx_hash or "already-on-chain",
                block_number=record.block_number or 0,
            )
            return success_response(
                data=serialize_credential_type(updated or record),
                message="Credential type already anchored on-chain",
            )

        chain_result = registry.register_credential_type(
            type_id=type_id,
            revocable=bool(record.revocable),
            schema_hash=schema_hash,
        )
        updated = update_credential_type_chain_anchor(
            db,
            type_id,
            schema_hash=schema_hash,
            tx_hash=chain_result["tx_hash"],
            block_number=chain_result["block_number"],
        )
        return success_response(
            data=serialize_credential_type(updated or record),
            message="Credential type anchored on-chain successfully",
        )
    except CredentialTypeRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
