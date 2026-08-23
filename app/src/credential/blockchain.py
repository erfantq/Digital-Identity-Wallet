import logging

from app.src.blockchain.config import get_blockchain_settings
from app.src.credential.registry import CredentialRegistryError, get_credential_registry
from app.src.credential.sbt import CertificateSBTError, get_certificate_sbt

logger = logging.getLogger(__name__)


def register_credential_on_chain(
    credential_id: str,
    credential_hash: str,
    issuer_address: str,
    holder_did: str,
) -> dict:
    """
    Register a credential anchor on CredentialRegistry.

    Returns:
        {"tx_hash": str, "block_number": int}
    """
    settings = get_blockchain_settings()
    if not settings.credential_registry_address:
        raise CredentialRegistryError("CREDENTIAL_REGISTRY_ADDRESS is not configured")

    registry = get_credential_registry()
    result = registry.register_credential(
        credential_id=credential_id,
        credential_hash=credential_hash,
        issuer=issuer_address,
        holder_did=holder_did,
    )
    logger.info(
        "Credential registered on-chain id=%s tx=%s block=%s",
        credential_id,
        result["tx_hash"],
        result["block_number"],
    )
    return result


def revoke_credential_on_chain(
    credential_id: str,
    reason_code: int = 0,
) -> dict:
    """
    Revoke a credential on CredentialRegistry.

    Returns:
        {"tx_hash": str, "block_number": int}
    """
    settings = get_blockchain_settings()
    if not settings.credential_registry_address:
        raise CredentialRegistryError("CREDENTIAL_REGISTRY_ADDRESS is not configured")

    registry = get_credential_registry()
    result = registry.revoke_credential(
        credential_id=credential_id,
        reason_code=reason_code,
    )
    logger.info(
        "Credential revoked on-chain id=%s tx=%s block=%s",
        credential_id,
        result["tx_hash"],
        result["block_number"],
    )
    return result


def mint_certificate_sbt_on_chain(
    holder_address: str,
    credential_id: str,
    credential_hash: str,
    issuer_address: str,
    token_uri: str = "",
) -> dict:
    """
    Mint a non-transferable certificate NFT to the holder.

    Returns:
        {"tx_hash": str, "block_number": int, "token_id": int, "token_uri": str}
    """
    settings = get_blockchain_settings()
    if not settings.certificate_sbt_address:
        raise CertificateSBTError("CERTIFICATE_SBT_ADDRESS is not configured")

    sbt = get_certificate_sbt()
    result = sbt.mint_certificate(
        holder_address=holder_address,
        credential_id=credential_id,
        credential_hash=credential_hash,
        issuer=issuer_address,
        token_uri=token_uri,
    )
    logger.info(
        "Certificate SBT minted id=%s token=%s tx=%s block=%s uri=%s",
        credential_id,
        result["token_id"],
        result["tx_hash"],
        result["block_number"],
        result.get("token_uri"),
    )
    return result


def revoke_certificate_sbt_on_chain(credential_id: str) -> dict:
    """
    Mark the soulbound certificate as revoked without transferring it.

    Returns:
        {"tx_hash": str, "block_number": int, "token_id": int}
    """
    settings = get_blockchain_settings()
    if not settings.certificate_sbt_address:
        raise CertificateSBTError("CERTIFICATE_SBT_ADDRESS is not configured")

    sbt = get_certificate_sbt()
    result = sbt.revoke_certificate(credential_id=credential_id)
    logger.info(
        "Certificate SBT revoked id=%s token=%s tx=%s block=%s",
        credential_id,
        result.get("token_id"),
        result["tx_hash"],
        result["block_number"],
    )
    return result
