from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from .security import hash_password, verify_password, create_access_token
from .repository import (
    get_user_by_username,
    get_user_by_email,
    get_user_by_id,
    create_user,
    get_next_wallet_index,
    list_users_query,
    delete_user,
)
from app.src.blockchain.hdWallet import derive_wallet_from_index
from app.src.common.messaging import event_bus
from app.src.common.pagination import paginate
from app.src.common.response import success_response, error_response
from app.src.common.auth_dependencies import CurrentUser
from app.src.did.repository import get_did_doc_by_user_id, update_did_active_status, delete_did_by_user_id
from app.src.did.models import Did
from app.src.credential.models import Credential
from app.src.credential.enums import CredentialStatus
from sqlalchemy import func
from web3 import Web3
from .enums import UserRoleEnum
from .models import User

async def register_user(
    db: Session,
    username: str,
    password: str,
    email: str | None = None,
    role: UserRoleEnum = UserRoleEnum.USER,
    current_user: CurrentUser | None = None,
):
    resolved_role = role or UserRoleEnum.USER

    if resolved_role == UserRoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create super_admin via registration",
        )

    if resolved_role == UserRoleEnum.ADMIN:
        if not current_user or current_user.role != UserRoleEnum.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super_admin can register new admin users",
            )

    existing_username = get_user_by_username(db, username)

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    if email:
        existing_email = get_user_by_email(db, email)

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        
    wallet_index = get_next_wallet_index(db)

    wallet = derive_wallet_from_index(wallet_index)
    
    # eth_address = Web3.to_checksum_address(wallet.address)
    eth_address = wallet.address

    user = create_user(
        db=db,
        username=username,
        email=email,
        password_hash=hash_password(password),
        wallet_index=wallet.wallet_index,
        eth_address=eth_address,
        role=resolved_role
    )

    # used in DID service to create DID for the user
    await event_bus.publish(
        "user.created",
        {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": wallet.address,
            "role": user.role.value if hasattr(user.role, "value") else user.role
        }
    )

    return success_response(
        data={
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": user.eth_address,
            "role": user.role.value if hasattr(user.role, "value") else user.role
        },
        message="User registered successfully. DID creation started."   
    )


def login_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token({
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "wallet_index": user.wallet_index,
        "eth_address": user.eth_address,
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


def _sync_did_active_from_chain(db: Session, did_record) -> bool | None:
    if not did_record:
        return None

    try:
        from app.src.blockchain.config import get_blockchain_settings
        from app.src.did.registry import get_did_registry

        settings = get_blockchain_settings()
        if not settings.did_registry_address:
            return bool(did_record.active)

        registry = get_did_registry()
        on_chain_active = registry.is_active(did_record.did)
        if bool(did_record.active) != on_chain_active:
            updated = update_did_active_status(db, did_record.did, on_chain_active)
            if updated:
                did_record.active = updated.active
        return on_chain_active
    except Exception:
        return bool(did_record.active)


def _serialize_user_summary(user, did_record=None) -> dict:
    role = user.role.value if hasattr(user.role, "value") else user.role
    did_active = None
    if did_record is not None:
        did_active = bool(did_record.active)

    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": role,
        "wallet_index": user.wallet_index,
        "eth_address": user.eth_address,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "has_did": did_record is not None,
        "did": did_record.did if did_record else None,
        "did_active": did_active,
    }


def _serialize_did_detail(did_record) -> dict | None:
    if not did_record:
        return None

    return {
        "did": did_record.did,
        "ethereum_address": did_record.ethereum_address,
        "document_hash": did_record.document_hash,
        "tx_hash": did_record.tx_hash,
        "block_number": did_record.block_number,
        "active": did_record.active,
        "created_at": did_record.created_at.isoformat() if did_record.created_at else None,
        "updated_at": did_record.updated_at.isoformat() if did_record.updated_at else None,
    }


def list_users(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    role: UserRoleEnum | None = None,
):
    query = list_users_query(db, search=search, role=role)
    paginated = paginate(query, page=page, page_size=page_size)

    items = []
    for user, did_record in paginated["items"]:
        if did_record is not None:
            _sync_did_active_from_chain(db, did_record)
        items.append(_serialize_user_summary(user, did_record))

    return success_response(
        data={
            "items": items,
            "pagination": paginated["pagination"],
        },
        message="Users retrieved successfully",
    )


def get_user_detail(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    did_record = get_did_doc_by_user_id(db, user_id)
    if did_record is not None:
        _sync_did_active_from_chain(db, did_record)

    return success_response(
        data={
            **_serialize_user_summary(user, did_record),
            "did_details": _serialize_did_detail(did_record),
        },
        message="User retrieved successfully",
    )


def _role_value(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def get_admin_dashboard(db: Session):
    total_users = db.query(User).count()

    users_by_role = {
        _role_value(role): count
        for role, count in db.query(User.role, func.count(User.id)).group_by(User.role).all()
    }

    total_dids = db.query(Did).count()
    active_dids = db.query(Did).filter(Did.active.is_(True)).count()
    deactivated_dids = db.query(Did).filter(Did.active.is_(False)).count()
    pending_dids = max(total_users - total_dids, 0)

    total_credentials = db.query(Credential).count()
    active_credentials = (
        db.query(Credential)
        .filter(Credential.status == CredentialStatus.ACTIVE)
        .count()
    )
    revoked_credentials = (
        db.query(Credential)
        .filter(Credential.status == CredentialStatus.REVOKED)
        .count()
    )
    sbt_minted = db.query(Credential).filter(Credential.sbt_token_id.isnot(None)).count()
    on_chain_registered = db.query(Credential).filter(Credential.tx_hash.isnot(None)).count()
    sbt_pending = (
        db.query(Credential)
        .filter(
            Credential.status == CredentialStatus.ACTIVE,
            Credential.sbt_token_id.is_(None),
        )
        .count()
    )
    registry_pending = (
        db.query(Credential)
        .filter(
            Credential.status == CredentialStatus.ACTIVE,
            Credential.tx_hash.is_(None),
        )
        .count()
    )

    credentials_by_type = [
        {"type": cred_type or "Unknown", "count": count}
        for cred_type, count in (
            db.query(Credential.type, func.count(Credential.id))
            .group_by(Credential.type)
            .order_by(func.count(Credential.id).desc())
            .all()
        )
    ]

    recent_users_rows = (
        db.query(User, Did)
        .outerjoin(Did, Did.user_id == User.id)
        .order_by(User.id.desc())
        .limit(5)
        .all()
    )
    recent_users = []
    for user, did_record in recent_users_rows:
        recent_users.append(_serialize_user_summary(user, did_record))

    recent_credentials_rows = (
        db.query(Credential, User.username)
        .outerjoin(Did, Did.did == Credential.holder_did)
        .outerjoin(User, User.id == Did.user_id)
        .order_by(Credential.created_at.desc())
        .limit(5)
        .all()
    )
    recent_credentials = []
    for credential, holder_username in recent_credentials_rows:
        recent_credentials.append(
            {
                "credential_id": credential.credential_id,
                "type": credential.type,
                "status": credential.status.value
                if hasattr(credential.status, "value")
                else credential.status,
                "holder_did": credential.holder_did,
                "holder_username": holder_username,
                "sbt_token_id": credential.sbt_token_id,
                "sbt_tx_hash": credential.sbt_tx_hash,
                "tx_hash": credential.tx_hash,
                "created_at": credential.created_at.isoformat()
                if credential.created_at
                else None,
            }
        )

    return success_response(
        data={
            "summary": {
                "total_users": total_users,
                "total_dids": total_dids,
                "active_dids": active_dids,
                "deactivated_dids": deactivated_dids,
                "pending_dids": pending_dids,
                "total_credentials": total_credentials,
                "active_credentials": active_credentials,
                "revoked_credentials": revoked_credentials,
                "sbt_minted": sbt_minted,
                "on_chain_registered": on_chain_registered,
                "sbt_pending": sbt_pending,
                "registry_pending": registry_pending,
            },
            "users_by_role": users_by_role,
            "credentials_by_type": credentials_by_type,
            "recent_users": recent_users,
            "recent_credentials": recent_credentials,
        },
        message="Admin dashboard stats retrieved successfully",
    )


def _issuer_authorization_status(eth_address: str | None) -> bool | None:
    if not eth_address:
        return None

    try:
        from app.src.blockchain.config import get_blockchain_settings
        from app.src.trust.registry import (
            TrustedEntityRegistryError,
            get_trusted_entity_registry,
        )

        settings = get_blockchain_settings()
        if not settings.trusted_entity_registry_address:
            return None

        return get_trusted_entity_registry().is_authorized_issuer(eth_address)
    except TrustedEntityRegistryError:
        return None
    except Exception:
        return None


def list_admins(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
):
    query = list_users_query(db, search=search, role=UserRoleEnum.ADMIN)
    paginated = paginate(query, page=page, page_size=page_size)

    items = []
    for user, did_record in paginated["items"]:
        if did_record is not None:
            _sync_did_active_from_chain(db, did_record)
        summary = _serialize_user_summary(user, did_record)
        summary["is_authorized_issuer"] = _issuer_authorization_status(user.eth_address)
        items.append(summary)

    return success_response(
        data={
            "items": items,
            "pagination": paginated["pagination"],
        },
        message="Admins retrieved successfully",
    )


def get_admin_detail(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    role_value = _role_value(user.role)
    if role_value != UserRoleEnum.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    did_record = get_did_doc_by_user_id(db, user_id)
    if did_record is not None:
        _sync_did_active_from_chain(db, did_record)

    return success_response(
        data={
            **_serialize_user_summary(user, did_record),
            "did_details": _serialize_did_detail(did_record),
            "is_authorized_issuer": _issuer_authorization_status(user.eth_address),
        },
        message="Admin retrieved successfully",
    )


def delete_admin(db: Session, user_id: int, current_user: CurrentUser):
    if current_user.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    role_value = _role_value(user.role)
    if role_value != UserRoleEnum.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only regular admin accounts can be deleted here",
        )

    eth_address = user.eth_address
    delete_did_by_user_id(db, user_id)
    deleted = delete_user(db, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    return success_response(
        data={
            "user_id": user_id,
            "eth_address": eth_address,
            "deleted": True,
        },
        message="Admin deleted successfully",
    )
