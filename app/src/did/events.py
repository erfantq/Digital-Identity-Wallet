from app.src.did.dependencies import SessionLocal
from app.src.messaging import event_bus
from .schemas import DIDMethod
from .models import Did
from .service import generate_did_document
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

async def handle_user_created(data):
    """Handle user.created events to automatically create a DID."""
    logger.info(f"Handling user.created event for user {data['user_id']}")

    db = SessionLocal()

    try:
    
        # Create a DID for the new user
        user_id = data["user_id"]
        method = DIDMethod.ETHR  # Default method
        eth_address = data["eth_address"]
        
        # Generate DID
        # TODO add chain id (besu)
        did_id = f"did:{method}:{user_id}:{eth_address}"
        
        # Generate DID document
        resolution = generate_did_document(did_id, method)
        document=json.dumps(resolution.didDocument.model_dump(by_alias=True))

        # TODO store DID document hash in blockchain to get its tx_hash and block_number so I can restore it in my database

        # Store in database
        new_did_object = Did(
            did=did_id,
            ethereum_address=eth_address,
            document=document,
            document_hash=hash(document),
            user_id=user_id
        )

        db.add(new_did_object)
        db.commit()
        db.refresh(new_did_object)
        
        logger.info(f"Created DID {did_id} for user {user_id}")
        
        # Publish DID created event
        await event_bus.publish("did.created", {
            "did": did_id,
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"Error creating DID for user {data['user_id']}: {str(e)}")
