from .dependencies import SessionLocal
from .schemas import DIDCreate
from .service import create_did_service
from .blockchain import register_did_on_chain
from .repository import get_did_by_string, update_did_chain_anchor
from app.src.blockchain.config import get_blockchain_settings
from app.src.blockchain.did_registry import DIDRegistryError
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

        await create_did_service(
            did=did,
            db=db,
        )

    except Exception as e:
        logger.error(f"Error creating DID for user {data['user_id']}: {str(e)}")
    finally:
        db.close()


async def handle_did_created(data):
    """
    Anchor a newly created DID on DIDRegistry and persist tx/block metadata.
    """
    did = data.get("did")
    ethereum_address = data.get("ethereum_address")
    document_hash = data.get("document_hash")

    logger.info("Handling did.created event for did=%s", did)

    settings = get_blockchain_settings()
    if not settings.require_did_on_chain:
        logger.info("REQUIRE_DID_ON_CHAIN=false; skipping on-chain DID registration")
        return

    if not did or not ethereum_address:
        logger.error("did.created payload missing did or ethereum_address: %s", data)
        return

    db = SessionLocal()
    try:
        record = get_did_by_string(db, did)
        if record and record.tx_hash:
            logger.info("DID already anchored in DB did=%s tx=%s", did, record.tx_hash)
            return

        if not document_hash:
            if not record or not record.document_hash:
                logger.error("document_hash missing for did=%s", did)
                return
            document_hash = record.document_hash

        try:
            chain_result = register_did_on_chain(
                identity_address=ethereum_address,
                document_hash=document_hash,
                did=did,
            )
        except DIDRegistryError as exc:
            # Idempotent re-delivery: already on-chain is not a hard failure.
            if "already registered" in str(exc).lower():
                logger.warning("DID already on-chain, skipping register: %s", did)
                return
            raise

        updated = update_did_chain_anchor(
            db=db,
            did=did,
            tx_hash=chain_result["tx_hash"],
            block_number=chain_result["block_number"],
        )
        if not updated:
            logger.error("DID row not found while saving chain anchor did=%s", did)
            return

        logger.info(
            "DID on-chain anchor saved did=%s tx=%s block=%s",
            did,
            chain_result["tx_hash"],
            chain_result["block_number"],
        )
    except Exception as exc:
        logger.exception("Failed to register DID on-chain did=%s: %s", did, exc)
        raise
    finally:
        db.close()
