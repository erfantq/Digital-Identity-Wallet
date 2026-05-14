from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from .dependencies import SessionLocal, get_db
from .schemas import (
    DIDCreate, DIDDocument, DIDResolution, DIDMethod,
    DIDResolutionMetadata, DIDDocumentMetadata
)
from .models import Did
from .service import create_did_service
from app.src.messaging import event_bus
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

@router.post("/dids", response_model=DIDDocument, tags=["dids"])
async def create_did(
    did: DIDCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db=Depends(get_db)
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
            "method": did.method,
            "identifier": did.identifier
        }
    ) as span:

        logger.info(f"Creating DID with method: {did.method}")

        try:
            await create_did_service(did=did, background_tasks=background_tasks,db=db)

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

# @router.get("/dids/{did}", response_model=DIDResolution, tags=["dids"])
# async def resolve_did(did: str, request: Request, db=Depends(get_db)):
#     """
#     Resolve a DID to its DID document
    
#     - **did**: The full DID to resolve (e.g., 'did:ethr:0x1234...')
    
#     Returns a DID Resolution object conforming to the W3C DID spec.
#     """
#     # Create a tracing span
#     context = extract_context_from_request(request)
#     with create_span("resolve_did", context=context, attributes={"did": did}) as span:
#         logger.info(f"Resolving DID: {did}")
#         try:
#             async with pool.acquire() as conn:
#                 # Find DID in database
#                 result = await conn.fetchrow(
#                     "SELECT document, created_at, updated_at FROM dids WHERE did = $1", did
#                 )
                
#                 if not result:
#                     logger.warning(f"DID not found: {did}")
#                     error_msg = "DID not found"
                    
#                     resolution_metadata = DIDResolutionMetadata(
#                         contentType="application/did+json",
#                         retrieved=datetime.now(timezone.utc).isoformat() + "Z",
#                         error=error_msg
#                     )
                    
#                     return DIDResolution(
#                         didResolutionMetadata=resolution_metadata,
#                         didDocument=DIDDocument(id=did),
#                         didDocumentMetadata=DIDDocumentMetadata()
#                     )
                
#                 # Parse document from database
#                 document = json.loads(result["document"])
                
#                 # Convert to DID document
#                 did_document = DIDDocument(**document)
                
#                 # Create resolution metadata
#                 resolution_metadata = DIDResolutionMetadata(
#                     contentType="application/did+json",
#                     retrieved=datetime.now(timezone.utc).isoformat() + "Z"
#                 )
                
#                 # Create document metadata
#                 document_metadata = DIDDocumentMetadata(
#                     created=result["created_at"].isoformat() + "Z" if result["created_at"] else None,
#                     updated=result["updated_at"].isoformat() + "Z" if result["updated_at"] else None
#                 )
                
#                 # Add span attributes
#                 add_span_attributes({"found": True})
                
#                 # Return full resolution
#                 return DIDResolution(
#                     didResolutionMetadata=resolution_metadata,
#                     didDocument=did_document,
#                     didDocumentMetadata=document_metadata
#                 )
                
#         except Exception as e:
#             logger.error(f"Error resolving DID: {str(e)}")
#             mark_span_error(e)
#             raise HTTPException(status_code=500, detail=f"Error resolving DID: {str(e)}")

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