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
from .registry import DIDRegistryError, get_did_registry
from app.src.common.messaging import event_bus
from app.src.common.auth_dependencies import CurrentUser, require_admin
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
    _: CurrentUser = Depends(require_admin),
):
    try:
        registry = get_did_registry()
        result = registry.deactivate_did(request.did)
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