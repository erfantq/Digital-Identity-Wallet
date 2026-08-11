import logging

from app.src.blockchain.config import get_blockchain_settings
from app.src.did.registry import DIDRegistryError, get_did_registry

logger = logging.getLogger(__name__)


def register_did_on_chain(
    identity_address: str,
    document_hash: str,
    did: str,
) -> dict:
    """
    Register a DID anchor on DIDRegistry.

    Returns:
        {"tx_hash": str, "block_number": int}
    """
    settings = get_blockchain_settings()
    if not settings.did_registry_address:
        raise DIDRegistryError("DID_REGISTRY_ADDRESS is not configured")

    registry = get_did_registry()
    result = registry.register_did(
        did=did,
        controller=identity_address,
        document_hash=document_hash,
    )
    logger.info(
        "DID registered on-chain did=%s tx=%s block=%s",
        did,
        result["tx_hash"],
        result["block_number"],
    )
    return result
