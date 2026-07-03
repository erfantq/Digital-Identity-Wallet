from .repository import (
    check_did_exists,
    check_user_did_exists,
)
from fastapi import Depends, HTTPException, status, BackgroundTasks
from .schemas import (
    DIDCreate, DIDDocument, DIDResolution, DIDMethod,
    VerificationMethod, DIDResolutionMetadata, DIDDocumentMetadata
)
from .models import Did
from datetime import datetime, timezone
from .dependencies import get_db, SessionLocal
from app.src.common.messaging import event_bus
from app.src.auth.repository import (
    get_user_by_id
)
from app.src.blockchain.hdWallet import derive_wallet_from_index
from .telemetry import add_span_attributes
from web3 import Web3
from sqlalchemy.orm import Session
from .blockchain import register_did_on_chain
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


def generate_did_document(did: str, method: DIDMethod, controller: str = None):
    """Generate a DID document based on method and parameters"""
    now = datetime.now(timezone.utc).isoformat() + "Z"
    controller = controller or did
    
    # Create different verification methods based on DID method
    if method == DIDMethod.KEY:
        key_id = f"{did}#keys-1"
        verification_method = VerificationMethod(
            id=key_id,
            type="Ed25519VerificationKey2020",
            controller=did,
            publicKeyMultibase="z" + did.split(":")[-1]  # Example format, would vary based on actual implementation
        )
    elif method == DIDMethod.WEB:
        key_id = f"{did}#keys-1"
        verification_method = VerificationMethod(
            id=key_id,
            type="Ed25519VerificationKey2020",
            controller=did,
            publicKeyJwk={
                "kty": "OKP",
                "crv": "Ed25519",
                "x": str(uuid.uuid4())  # Placeholder for actual key
            }
        )
    elif method == DIDMethod.ETHR:
        key_id = f"{did}#owner"
        addr = did.split(":")[-1]
        verification_method = VerificationMethod(
            id=key_id,
            type="EcdsaSecp256k1RecoveryMethod2020",
            controller=did,
            blockchainAccountId=f"eip155:1:{addr}"
        )
    else:
        # Default key type
        key_id = f"{did}#keys-1"
        verification_method = VerificationMethod(
            id=key_id,
            type="Ed25519VerificationKey2020",
            controller=did,
            publicKeyJwk={
                "kty": "OKP",
                "crv": "Ed25519",
                "x": str(uuid.uuid4())  # Placeholder for actual key
            }
        )
    
    # Create DID document
    did_document = DIDDocument(
        id=did,
        controller=controller,
        verificationMethod=[verification_method],
        authentication=[key_id]
    )
    
    # Resolution metadata
    resolution_metadata = DIDResolutionMetadata(
        contentType="application/did+json",
        retrieved=datetime.now(timezone.utc).isoformat() + "Z"
    )
    
    # Document metadata
    document_metadata = DIDDocumentMetadata(
        created=now,
        updated=now
    )
    
    # Full resolution object
    resolution = DIDResolution(
        didResolutionMetadata=resolution_metadata,
        didDocument=did_document,
        didDocumentMetadata=document_metadata
    )
    
    return resolution

async def create_did_service(
    did: DIDCreate,
    db: Session,
    background_tasks: BackgroundTasks | None = None,
):
    """
        Create a Did with ETHR method
    """
    target_user = get_user_by_id(db, did.user_id)
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )

    if target_user.wallet_index is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user does not have wallet_index"
        )
        
    # Derive Ethereum wallet from user's wallet_index
    try:
        wallet = derive_wallet_from_index(target_user.wallet_index)
    except Exception as e:
        logger.error(f"Failed to derive wallet for user {target_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to derive wallet for target user"
        )

    # ethereum_address = Web3.to_checksum_address(wallet.address)
    ethereum_address = wallet.address

    # TODO add chain id (besu)
    did_id = f"did:ethr:{target_user.id}:{ethereum_address}"

    existing = check_did_exists(db=db, did=did_id)
    # existing = await conn.fetchrow(
    #     "SELECT did FROM dids WHERE did = $1",
    #     did_id
    # )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DID already exists"
        )
        
    existing_user_did = check_user_did_exists(db=db, user_id=did.user_id)

    if existing_user_did:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user already has a DID"
        )

    # create Did
    resolution = generate_did_document(
        did=did_id,
        method=DIDMethod.ETHR.value,
        controller=did.controller
    )

    did_document = resolution.didDocument

    document_json = json.dumps(
        did_document.model_dump(by_alias=True),
        sort_keys=True
    )

    # Document hash to store in blockchain
    document_hash = Web3.keccak(text=document_json).hex()

    # Endpoint address for resolve method
    service_endpoint = f"/dids/{did_id}"

    # ثبت روی بلاکچین
    # فرض: این تابع به smart contract وصل می‌شود
    # TODO implement functionality - Also should be handled by events (did.created)
    # chain_result = await register_did_on_chain(
    #     identity_address=ethereum_address,
    #     document_hash=document_hash,
    #     service_endpoint=service_endpoint
    # )

    # tx_hash = chain_result.get("tx_hash")
    # block_number = chain_result.get("block_number")

    # Save in database as a cache reference
    new_did = Did(
        user_id=target_user.id,
        did=did_id,
        document=document_json,
        ethereum_address=ethereum_address,
        document_hash=document_hash,
        tx_hash=None,
        block_number=None,
    )

    db.add(new_did)
    db.commit()
    db.refresh(new_did)

    logger.info(f"Successfully created ETHR DID on-chain: {did_id}")

    event_payload = {
            "user_id": target_user.id,
            "did": did_id,
            "method": "ethr",
            "ethereum_address": ethereum_address,
            "tx_hash": None,
            "block_number": None
        }
    # TODO use this event for submit in blockchain
    if background_tasks is not None:
        background_tasks.add_task(
            event_bus.publish,
            "did.created",
            event_payload
        )
    else:
        await event_bus.publish(
            "did.created",
            event_payload
        )


    add_span_attributes({
        "target_user_id": target_user.id,
        "did_id": did_id,
        "ethereum_address": ethereum_address,
        "tx_hash": None
    })

    return did_document


## TODO check with blockchain for consitency
def resolve_did_service(
    did: str,
    db: Session,
) -> DIDResolution:
    # Find DID in database using ORM
    did_record = db.query(Did).filter(Did.did == did).first()

    if not did_record:
        resolution_metadata = DIDResolutionMetadata(
            contentType="application/did+json",
            retrieved=datetime.now(timezone.utc).isoformat(),
            error="DID not found"
        )

        return DIDResolution(
            didResolutionMetadata=resolution_metadata,
            didDocument=DIDDocument(id=did),
            didDocumentMetadata=DIDDocumentMetadata()
        )

    # Parse stored DID document
    try:
        if isinstance(did_record.document, str):
            document_data = json.loads(did_record.document)
        else:
            document_data = did_record.document

        did_document = DIDDocument(**document_data)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid DID document stored in database: {str(e)}"
        )

    resolution_metadata = DIDResolutionMetadata(
        contentType="application/did+json",
        retrieved=datetime.now(timezone.utc).isoformat()
    )

    document_metadata = DIDDocumentMetadata(
        created=did_record.created_at.isoformat() if did_record.created_at else None,
        updated=did_record.updated_at.isoformat() if did_record.updated_at else None
    )

    return DIDResolution(
        didResolutionMetadata=resolution_metadata,
        didDocument=did_document,
        didDocumentMetadata=document_metadata
    )
