import asyncio
from .dependencies import SessionLocal
from .schemas import DIDCreate
from .service import create_did_service
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
        user_id = data["user_id"]
        
        did = DIDCreate(
            user_id=user_id,
        )
        
        # asyncio.run(
        #     create_did_service(
        #         did=did,
        #         db=db,
        #     )
        # )
        await create_did_service(
            did=did,
            db=db,
        )

        
        
    except Exception as e:
        logger.error(f"Error creating DID for user {data['user_id']}: {str(e)}")
