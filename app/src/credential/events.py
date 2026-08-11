from .dependencies import SessionLocal
from .blockchain import register_credential_on_chain, revoke_credential_on_chain
from .registry import CredentialRegistryError
from .repository import (
    get_credential_by_id,
    update_credential_chain_anchor,
    update_credential_revoke_anchor,
)
from app.src.blockchain.config import get_blockchain_settings
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger(__name__)


async def handle_cred_created(data):
    """
    Anchor a newly issued credential on CredentialRegistry and persist tx/block metadata.
    """
    credential_id = data.get("credential_id")
    credential_hash = data.get("credential_hash")
    holder_did = data.get("holder_did")
    issuer_address = data.get("issuer_address")

    logger.info("Handling cred.created event for credential_id=%s", credential_id)

    settings = get_blockchain_settings()
    if not settings.require_credential_on_chain:
        logger.info(
            "REQUIRE_CREDENTIAL_ON_CHAIN=false; skipping on-chain credential registration"
        )
        return

    if not credential_id or not credential_hash or not holder_did or not issuer_address:
        logger.error("cred.created payload missing required fields: %s", data)
        return

    db = SessionLocal()
    try:
        record = get_credential_by_id(db, credential_id)
        if record and record.tx_hash:
            logger.info(
                "Credential already anchored in DB id=%s tx=%s",
                credential_id,
                record.tx_hash,
            )
            return

        if not credential_hash and record and record.credential_hash:
            credential_hash = record.credential_hash

        try:
            chain_result = register_credential_on_chain(
                credential_id=credential_id,
                credential_hash=credential_hash,
                issuer_address=issuer_address,
                holder_did=holder_did,
            )
        except CredentialRegistryError as exc:
            if "already registered" in str(exc).lower():
                logger.warning(
                    "Credential already on-chain, skipping register: %s",
                    credential_id,
                )
                return
            raise

        updated = update_credential_chain_anchor(
            db=db,
            credential_id=credential_id,
            credential_hash=credential_hash,
            tx_hash=chain_result["tx_hash"],
            block_number=chain_result["block_number"],
        )
        if not updated:
            logger.error(
                "Credential row not found while saving chain anchor id=%s",
                credential_id,
            )
            return

        logger.info(
            "Credential on-chain anchor saved id=%s tx=%s block=%s",
            credential_id,
            chain_result["tx_hash"],
            chain_result["block_number"],
        )
    except Exception as exc:
        logger.exception(
            "Failed to register credential on-chain id=%s: %s",
            credential_id,
            exc,
        )
        raise
    finally:
        db.close()


async def handle_cred_revoked(data):
    """
    Revoke a credential on CredentialRegistry and persist revoke_tx_hash.
    """
    credential_id = data.get("credential_id")
    reason_code = int(data.get("reason_code") or 0)

    logger.info("Handling cred.revoked event for credential_id=%s", credential_id)

    settings = get_blockchain_settings()
    if not settings.require_credential_on_chain:
        logger.info(
            "REQUIRE_CREDENTIAL_ON_CHAIN=false; skipping on-chain credential revocation"
        )
        return

    if not credential_id:
        logger.error("cred.revoked payload missing credential_id: %s", data)
        return

    db = SessionLocal()
    try:
        record = get_credential_by_id(db, credential_id)
        if record and record.revoke_tx_hash:
            logger.info(
                "Credential already revoked on-chain in DB id=%s tx=%s",
                credential_id,
                record.revoke_tx_hash,
            )
            return

        try:
            chain_result = revoke_credential_on_chain(
                credential_id=credential_id,
                reason_code=reason_code,
            )
        except CredentialRegistryError as exc:
            message = str(exc).lower()
            if "already revoked" in message:
                logger.warning(
                    "Credential already revoked on-chain, skipping: %s",
                    credential_id,
                )
                return
            raise

        updated = update_credential_revoke_anchor(
            db=db,
            credential_id=credential_id,
            revoke_tx_hash=chain_result["tx_hash"],
        )
        if not updated:
            logger.error(
                "Credential row not found while saving revoke anchor id=%s",
                credential_id,
            )
            return

        logger.info(
            "Credential on-chain revocation saved id=%s tx=%s block=%s",
            credential_id,
            chain_result["tx_hash"],
            chain_result["block_number"],
        )
    except Exception as exc:
        logger.exception(
            "Failed to revoke credential on-chain id=%s: %s",
            credential_id,
            exc,
        )
        raise
    finally:
        db.close()
