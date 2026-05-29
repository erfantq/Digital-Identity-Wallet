from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator
from .schemas import CredentialIssue
from .dependencies import get_db
from .models import Credential
from app.src.did.repository import check_did_exists
from .response import success_response, error_response
import uuid
import json
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/credentials",
    tags=["credentials"]
)

@router.post("/issue", tags=["credentials"])
async def issue_credential(
    cred: CredentialIssue,
    db: Session = Depends(get_db),
):
    logger.info(f"Issuing credential for DID: {cred.holder_did}")
    try:
        did_exists = check_did_exists(did=cred.holder_did, db=db)
        if not did_exists:
            raise HTTPException(status_code=404, detail="DID not found")
        
        credential_id = f"cred:{uuid.uuid4()}"

        new_credential = Credential(
            credential_id=credential_id,
            issuer="system",
            holder_did=cred.holder_did,
            type="VerifiableCredential",
            credential=json.dumps(cred.credential_data)
        )

        db.add(new_credential)
        db.commit()
        db.refresh()

        logger.info(f"Successfully issued credential: {credential_id}")

        res = {"credential_id": credential_id}
        return success_response(data=res)
    except HTTPException as he:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to issue credential: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

# @router.get("/health", tags=["health"])
# async def health_check():
#     try:
#         pool = await get_db_pool().__anext__()
#         async with pool.acquire() as conn:
#             await conn.fetchval("SELECT 1")
#         return {"status": "healthy", "database": "connected"}
#     except Exception as e:
#         logger.error(f"Health check failed: {str(e)}")
#         return {"status": "unhealthy", "error": str(e)}
