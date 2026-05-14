from fastapi import Depends, HTTPException, status, BackgroundTasks
from .schemas import (
    DIDCreate, DIDDocument, DIDResolution, DIDMethod,
    VerificationMethod, DIDResolutionMetadata, DIDDocumentMetadata
)
from .models import Did
from datetime import datetime, timezone
from .dependencies import get_db, SessionLocal
from app.src.messaging import event_bus
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
    background_tasks: BackgroundTasks,
    db: Session,
):
    if did.method == DIDMethod.ETHR:

        # فعلاً فرض می‌کنیم identifier همان Ethereum address است
        # در نسخه واقعی بهتر است address از private key / Vault ساخته شود
        # TODO
        ethereum_address = Web3.to_checksum_address(did.identifier)

        did_id = f"did:ethr:{ethereum_address}"

        existing = db.query(Did).filter(Did.did == did_id).first()
        # existing = await conn.fetchrow(
        #     "SELECT did FROM dids WHERE did = $1",
        #     did_id
        # )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="DID already exists"
            )

        # create Did
        resolution = generate_did_document(
            did=did_id,
            method=did.method,
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
        # TODO implement functionality
        chain_result = await register_did_on_chain(
            identity_address=ethereum_address,
            document_hash=document_hash,
            service_endpoint=service_endpoint
        )

        tx_hash = chain_result.get("tx_hash")
        block_number = chain_result.get("block_number")

        # Save in database as a cache reference
        new_did = Did(
            did=did_id,
            document=document_json,
            ethereum_address=ethereum_address,
            document_hash=document_hash,
            tx_hash=tx_hash,
            block_number=block_number
        )

        db.add(new_did)
        db.commit()
        db.refresh(new_did)

        logger.info(f"Successfully created ETHR DID on-chain: {did_id}")

        background_tasks.add_task(
            event_bus.publish,
            "did.created",
            {
                "did": did_id,
                "method": "ethr",
                "ethereum_address": ethereum_address,
                "tx_hash": tx_hash,
                "block_number": block_number
            }
        )

        add_span_attributes({
            "did_id": did_id,
            "ethereum_address": ethereum_address,
            "tx_hash": tx_hash
        })

        return did_document

        

