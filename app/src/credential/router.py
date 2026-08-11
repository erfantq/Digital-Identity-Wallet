from webbrowser import get
import app
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, UploadFile, File
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator
from .schemas import CredentialIssue, CredentialVerifyRequest, credential_form_parser
from .dependencies import get_db
from .models import Credential
from .cryptography import sign_credential_with_private_key, calculate_credential_hash
from .ipfsService import upload_file_to_ipfs
from .verification import verify_credential
from app.src.blockchain.hdWallet import derive_wallet_from_index
from app.src.blockchain.config import get_blockchain_settings
from app.src.trust.registry import (
    TrustedEntityRegistryError,
    get_trusted_entity_registry,
)
from .enums import CredentialStatus
from app.src.did.repository import check_did_exists, get_did_doc_by_user_id
from app.src.common.auth_dependencies import CurrentUser, require_admin, get_current_user_from_token
from app.src.common.pagination import paginate
from app.src.common.messaging import event_bus
from app.src.common.response import success_response, error_response
from .registry import CredentialRegistryError, get_credential_registry
import uuid
import json
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
    prefix="/credentials",
    tags=["credentials"]
)


@router.post("/verify", tags=["credentials"])
async def verify_credential_endpoint(
    request: CredentialVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Relying Party verification endpoint.

    Body:
    {
      "credential": { ... full signed VC JSON ... }
    }
    """
    try:
        result = verify_credential(credential=request.credential, db=db)
        return success_response(
            data=result,
            message=(
                "Credential is valid"
                if result.get("valid")
                else "Credential verification failed"
            ),
        )
    except Exception as exc:
        logger.exception("Credential verification failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify credential: {exc}",
        )


@router.post("/issue", tags=["credentials"])
async def issue_credential(
    background_tasks: BackgroundTasks,
    cred: CredentialIssue = Depends(credential_form_parser), 
    attachment: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    admin_user: CurrentUser = Depends(require_admin),
):
    """
    sample request:
    {
    "holder_did": "did:ethr:6:0x1C7e13956dE0be618365E9229796c697638E4821",
    "type": "UniversityPIDCredential",
    "credential_data": {
        "firstName": "Erfan",
        "lastName": "Taghavi",
        "nationalId": "0920000000",
        "studentId": "400123456",
        "university": "Ferdowsi University of Mashhad",
        "faculty": "Engineering",
        "department": "Computer Engineering",
        "degreeLevel": "Bachelor",
        "enrollmentYear": 2021,
        "currentTerm": 8,
        "role": "Student"
        }
    }
    """
    logger.info(
        f"Issuing credential for holder DID: {cred.holder_did} by user_id={admin_user.user_id}"
    )

    try:
        if admin_user.wallet_index is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing wallet_index claim",
            )

        if not admin_user.eth_address:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing eth_address claim",
            )

        did_exists = check_did_exists(did=cred.holder_did, db=db)

        if not did_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Holder DID not found",
            )

        print(f"admin user wallet index: {admin_user.wallet_index}")
        issuer_wallet = derive_wallet_from_index(admin_user.wallet_index)
        print(f"issuer wallet address: {issuer_wallet.address}")
        print(f"admin user eth address: {admin_user.eth_address}")
        

        if issuer_wallet.address.lower() != admin_user.eth_address.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token eth_address does not match derived wallet address",
            )

        # Enforce on-chain Trusted List before issuing any VC.
        blockchain_settings = get_blockchain_settings()
        if blockchain_settings.require_trusted_issuer:
            try:
                registry = get_trusted_entity_registry()
                if not registry.is_authorized_issuer(issuer_wallet.address):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            "Issuer address is not an authorized PID/EAA provider "
                            "in TrustedEntityRegistry"
                        ),
                    )
            except HTTPException:
                raise
            except TrustedEntityRegistryError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                )
            except Exception as exc:
                logger.exception("TrustedEntityRegistry issuer check failed")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Failed to verify issuer on TrustedEntityRegistry: {exc}",
                )

        issuer_did_doc = get_did_doc_by_user_id(db=db, user_id=admin_user.user_id)
        
        if not issuer_did_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issuer DID not found",
            )
            
        if attachment is not None:
            res = await upload_file_to_ipfs(attachment)
            
            if res.status_code != 200:
                raise Exception(f"Failed to upload to IPFS: {res.text}")
            
            data = res.json()
            cid = data["IpfsHash"]
            ipfs_url = f"ipfs://{cid}"
            
        issuer_did = issuer_did_doc.did

        credential_id = f"urn:uuid:{uuid.uuid4()}"
        issued_at = datetime.now(timezone.utc).isoformat()

        credential_type = getattr(cred, "type", None) or "UniversityCredential"
        
        credential_subject = {
            **cred.credential_data,
            "id": cred.holder_did,
        }
        
        if attachment and ipfs_url:
            credential_subject["attachedDocument"] = ipfs_url
            ## TODO submit on blockchain as nft

        vc_payload = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1"
            ],
            "id": credential_id,
            "type": [
                "VerifiableCredential",
                credential_type,
            ],
            "issuer": issuer_did,
            "issuanceDate": issued_at,
            "credentialSubject": credential_subject,
        }

        signed_credential = sign_credential_with_private_key(
            credential=vc_payload,
            private_key=issuer_wallet.private_key,
            verification_method=f"{issuer_did}#controller",
        )

        credential_hash = calculate_credential_hash(signed_credential)

        new_credential = Credential(
            credential_id=credential_id,
            issuer=issuer_did,
            holder_did=cred.holder_did,
            type=cred.type,
            credential=json.dumps(signed_credential, ensure_ascii=False),
            credential_hash=credential_hash,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(new_credential)
        db.commit()
        db.refresh(new_credential)      
        
        logger.info(f"Successfully issued credential: {credential_id}")

        background_tasks.add_task(
            event_bus.publish,
            "cred.created",
            {
                "credential_id": credential_id,
                "holder_did": cred.holder_did,
                "issuer_did": issuer_did,
                "issuer_address": issuer_wallet.address,
                "credential_hash": credential_hash,
                "issued_at": issued_at,
                "type": credential_type,
            }
        )
        
        return success_response(
            data={
                "credential_id": credential_id,
                "issuer": issuer_did,
                "holder_did": cred.holder_did,
                "credential": signed_credential,
            },
            message="Credential issued successfully",
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to issue credential: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to issue credential",
        )
        
@router.get("/users/auth/credentials")
async def list_auth_user_credentials(
    current_user: CurrentUser = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    logger.info(f"Listing credentials for user_id={current_user.user_id}")
        
    # TODO - check proof with blockchain

    try:
        user_did_doc = get_did_doc_by_user_id(user_id=current_user.user_id, db=db)
    
        if not user_did_doc:
            logger.warning(f"No DID document found for user_id={current_user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No DID document found for current user",
            )
            
        query = (
            db.query(Credential)
            .filter(Credential.holder_did == user_did_doc.did)
            .order_by(Credential.id.desc())
        )

        paginated = paginate(
            query=query,
            page=page,
            page_size=page_size,
        )

        return success_response(
            data={
                "items": [
                    {
                        "credential_id": credential.credential_id,
                        "issuer": credential.issuer,
                        "holder_did": credential.holder_did,
                        "type": credential.type,
                        "status": credential.status,
                        "revoked_at": credential.revoked_at.isoformat() if credential.revoked_at else None,
                        "revoke_reason": credential.revoke_reason if credential.revoke_reason else None,
                        "credential": json.loads(credential.credential),
                    }
                    for credential in paginated["items"]
                ],
                "pagination": paginated["pagination"],
            },
            message="Credentials retrieved successfully",
        )

    except Exception as e:
        logger.error(f"Failed to list credentials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list credentials",
        )
        
@router.get("/users/{user_id}/credentials")
async def list_credentials_by_user_id(
    user_id: int, 
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    try:
        user_did_doc = get_did_doc_by_user_id(user_id=user_id, db=db)
        
        if not user_did_doc:
            logger.warning(f"No DID document found for user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No DID document found for requested user",
            )
            
        query = (
            db.query(Credential)
            .filter(Credential.holder_did == user_did_doc.did)
            .order_by(Credential.id.desc())
        )

        paginated = paginate(
            query=query,
            page=page,
            page_size=page_size,
        )

        return success_response(
            data={
                "items": [
                    {
                        "credential_id": credential.credential_id,
                        "issuer": credential.issuer,
                        "holder_did": credential.holder_did,
                        "type": credential.type,
                        "status": credential.status,
                        "revoked_at": credential.revoked_at.isoformat() if credential.revoked_at else None,
                        "revoke_reason": credential.revoke_reason if credential.revoke_reason else None,
                        "credential": json.loads(credential.credential),
                    }
                    for credential in paginated["items"]
                ],
                "pagination": paginated["pagination"],
            },
            message="Credentials retrieved successfully",
        )

    except Exception as e:
        logger.error(f"Failed to list credentials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list credentials",
        )

@router.get("/on-chain/status")
def get_credential_on_chain_status(
    credential_id: str = Query(..., description="Full credential id (urn:uuid:...)"),
):
    try:
        registry = get_credential_registry()
        record = registry.get_credential_record(credential_id)
        return success_response(
            data=record,
            message="Credential on-chain status fetched successfully",
        )
    except CredentialRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except Exception as exc:
        logger.exception(
            "Failed to fetch credential on-chain status id=%s", credential_id
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential not found on-chain or unreadable: {exc}",
        )

@router.get("/{credential_id}")
async def get_credential(credential_id: str, db: Session = Depends(get_db)):
    credential = db.query(Credential).filter(Credential.credential_id == credential_id).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    return success_response(
        data={
            "credential_id": credential.credential_id,
            "issuer": credential.issuer,
            "holder_did": credential.holder_did,
            "type": credential.type,
            "status": credential.status,
            "revoked_at": credential.revoked_at.isoformat() if credential.revoked_at else None,
            "revoke_reason": credential.revoke_reason if credential.revoke_reason else None,
            "tx_hash": credential.tx_hash,
            "block_number": credential.block_number,
            "revoke_tx_hash": credential.revoke_tx_hash,
            "credential": json.loads(credential.credential)
            if isinstance(credential.credential, str)
            else credential.credential,
        },
        message="Credential retrieved successfully",
    )
    
@router.post("/revoke")
async def revoke_credential(
    credential_id: str,
    background_tasks: BackgroundTasks,
    reason: str | None = None,
    reason_code: int = Query(0, ge=0, description="Compact on-chain revoke reason code"),
    db: Session = Depends(get_db),
    admin_user: CurrentUser = Depends(require_admin),
):
    credential = (
        db.query(Credential)
        .filter(Credential.credential_id == credential_id)
        .first()
    )

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    if credential.status == CredentialStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Credential is already revoked",
        )

    revoked_at = datetime.now(timezone.utc)

    credential.status = CredentialStatus.REVOKED
    credential.revoked_at = revoked_at
    credential.revoked_by = admin_user.user_id
    credential.revoke_reason = reason

    try:
        db.commit()
        db.refresh(credential)

        # On-chain revoke happens asynchronously via cred.revoked consumer.
        background_tasks.add_task(
            event_bus.publish,
            "cred.revoked",
            {
                "credential_id": credential.credential_id,
                "holder_did": credential.holder_did,
                "issuer_did": credential.issuer,
                "revoked_by": admin_user.user_id,
                "revoked_at": revoked_at.isoformat(),
                "reason": reason,
                "reason_code": reason_code,
            },
        )

        return success_response(
            data={
                "credential_id": credential.credential_id,
                "status": credential.status.value
                if hasattr(credential.status, "value")
                else credential.status,
                "revoked_at": revoked_at.isoformat(),
                "reason_code": reason_code,
            },
            message="Credential revoked successfully",
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to revoke credential: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke credential",
        )
        

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


# @router.post('/upload')
# async def upload(
#     document: UploadFile = File(...),
# ):
#     ipfs_url = await upload_file_to_ipfs(document)
#     return success_response(
#         data={
#             "ipfs_url": ipfs_url
#         },
#         message="File uploaded to IPFS successfully"
#     )
    