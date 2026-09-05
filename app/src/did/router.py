from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Query
from .dependencies import SessionLocal, get_db
from .schemas import (
    DIDCreate, DIDDocument, DIDResolution, DIDMethod,
    DIDResolutionMetadata, DIDDocumentMetadata, DeactivateDidRequest,
)
from .models import Did
from .service import (
    create_did_service,
    resolve_did_service
)
from .repository import get_did_doc_by_user_id, update_did_active_status, get_did_by_string, get_user_id_for_did
from app.src.auth.repository import get_user_by_id
from .registry import DIDRegistryError, get_did_registry
from app.src.common.messaging import event_bus
from app.src.common.auth_dependencies import (
    CurrentUser,
    get_current_user_from_token,
    require_admin,
)
from app.src.common.response import success_response
from .telemetry import create_span, extract_context_from_request, add_span_attributes, mark_span_error
from datetime import datetime, timezone
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dids",
    tags=["dids"]   
)

@router.post("/", response_model=DIDDocument, tags=["dids"])
async def create_did(
    did: DIDCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db=Depends(get_db),
    admin_user = Depends(require_admin),
):
    """
    Create a new Decentralized Identifier (DID)

    For did:ethr:
    - Ethereum address is used as DID identifier
    - DID state is registered on blockchain registry
    - Database stores only cache/reference metadata
    """

    context = extract_context_from_request(request)

    with create_span(
        "create_did",
        context=context,
        attributes={
            "method": DIDMethod.ETHR.value,
        }
    ) as span:

        logger.info(f"Creating DID with method: {DIDMethod.ETHR.value}")

        try:
            did_document = await create_did_service(did=did, db=db, background_tasks=background_tasks)
            
            return did_document

        except HTTPException as he:
            mark_span_error(he)
            raise

        except ValueError as ve:
            logger.error(f"Invalid DID input: {str(ve)}")
            mark_span_error(ve)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve)
            )

        except Exception as e:
            logger.error(f"Error creating DID: {str(e)}")
            mark_span_error(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )       
     
@router.get("/on-chain/status")
def get_did_on_chain_status(
    did: str = Query(..., description="Full DID string"),
):
    try:
        registry = get_did_registry()
        record = registry.get_did_record(did)
        return success_response(
            data=record,
            message="DID on-chain status fetched successfully",
        )
    except DIDRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except Exception as exc:
        logger.exception("Failed to fetch DID on-chain status did=%s", did)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DID not found on-chain or unreadable: {exc}",
        )


@router.post("/on-chain/deactivate")
def deactivate_did_on_chain(
    request: DeactivateDidRequest,
    db=Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    try:
        registry = get_did_registry()
        result = registry.deactivate_did(request.did)
        update_did_active_status(db, request.did, active=False)
        return success_response(
            data={"did": request.did, **result},
            message="DID deactivated on-chain successfully",
        )
    except DIDRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except Exception as exc:
        logger.exception("Failed to deactivate DID on-chain did=%s", request.did)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate DID: {exc}",
        )

# ok
@router.get("/me", response_model=DIDResolution, tags=["dids"])
async def resolve_my_did(
    request: Request,
    db=Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user_from_token),
):
    """
    Resolve the DID of the currently authenticated user.

    Same resolution logic and response shape as GET /dids/{did}.
    """
    did_record = get_did_doc_by_user_id(db=db, user_id=current_user.user_id)
    if not did_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No DID document found for current user",
        )

    context = extract_context_from_request(request)

    with create_span(
        "resolve_my_did",
        context=context,
        attributes={"did": did_record.did, "user_id": current_user.user_id},
    ) as span:

        logger.info(
            "Resolving DID for user_id=%s did=%s",
            current_user.user_id,
            did_record.did,
        )

        try:
            resolution = resolve_did_service(
                did=did_record.did,
                db=db,
            )

            found = resolution.didResolutionMetadata.error is None

            add_span_attributes({
                "found": found
            })

            if not found:
                logger.warning(f"DID not found: {did_record.did}")

            return resolution

        except HTTPException as he:
            mark_span_error(he)
            raise

        except Exception as e:
            logger.error(f"Error resolving DID: {str(e)}")
            mark_span_error(e)
            raise HTTPException(
                status_code=500,
                detail=f"Error resolving DID: {str(e)}"
            )

@router.get("/holder-profile", tags=["dids"])
def get_holder_profile_by_did(
    did: str = Query(..., description="Full DID string of the credential holder"),
    db=Depends(get_db),
    _admin=Depends(require_admin),
):
    """Resolve the wallet account linked to a holder DID (admin issue flow)."""
    did_record = get_did_by_string(db, did)
    if not did_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holder DID not found",
        )

    user_id = get_user_id_for_did(db, did)
    user = get_user_by_id(db, user_id) if user_id else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user account linked to this DID",
        )

    role = user.role.value if hasattr(user.role, "value") else user.role
    return success_response(
        data={
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role,
            "did": did_record.did,
            "ethereum_address": did_record.ethereum_address,
            "did_active": bool(did_record.active),
        },
        message="Holder profile retrieved successfully",
    )

# ok
@router.get("/{did}", response_model=DIDResolution, tags=["dids"])
async def resolve_did(
    did: str,
    request: Request,
    db=Depends(get_db)
):
    """
    Resolve a DID to its DID document

    - **did**: The full DID to resolve, for example: did:ethr:0x1234...

    Returns a DID Resolution object conforming to the W3C DID spec.
    """

    context = extract_context_from_request(request)

    with create_span(
        "resolve_did",
        context=context,
        attributes={"did": did}
    ) as span:

        logger.info(f"Resolving DID: {did}")

        try:
            resolution = resolve_did_service(
                did=did,
                db=db
            )

            found = resolution.didResolutionMetadata.error is None

            add_span_attributes({
                "found": found
            })

            if not found:
                logger.warning(f"DID not found: {did}")

            return resolution

        except HTTPException as he:
            mark_span_error(he)
            raise

        except Exception as e:
            logger.error(f"Error resolving DID: {str(e)}")
            mark_span_error(e)
            raise HTTPException(
                status_code=500,
                detail=f"Error resolving DID: {str(e)}"
            )

# @router.get("/health", tags=["health"])
# async def health_check():
#     """
#     Health check endpoint that verifies the service and database connection.
#     """
#     try:
#         pool = await get_db_pool().__anext__()
#         async with pool.acquire() as conn:
#             await conn.fetchval("SELECT 1")
#         return {"status": "healthy", "database": "connected"}
#     except Exception as e:
#         logger.error(f"Health check failed: {str(e)}")
#         return {"status": "unhealthy", "error": str(e)}