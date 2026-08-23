from .dependencies import SessionLocal
from .blockchain import (
    register_credential_on_chain,
    revoke_credential_on_chain,
    mint_certificate_sbt_on_chain,
    revoke_certificate_sbt_on_chain,
)
from .registry import CredentialRegistryError
from .sbt import CertificateSBTError, get_certificate_sbt
from .repository import (
    get_credential_by_id,
    update_credential_chain_anchor,
    update_credential_revoke_anchor,
    update_credential_sbt_anchor,
    update_credential_sbt_revoke_anchor,
)
from app.src.blockchain.config import get_blockchain_settings
from app.src.credential.cryptography import eth_address_from_did
from app.src.did.repository import get_did_by_string
from .ipfsService import IpfsUploadError
from .nft_metadata import pin_certificate_nft_metadata
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


def _parse_credential_json(record) -> dict:
    if not record or not record.credential:
        return {}
    raw = record.credential
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}


def _token_uri_from_payload(data: dict, record) -> str:
    token_uri = data.get("nft_metadata_uri") or data.get("token_uri") or ""
    if token_uri:
        return token_uri

    subject = _parse_credential_json(record).get("credentialSubject") or {}
    if isinstance(subject, dict):
        return subject.get("attachedDocument") or ""
    return ""


async def _build_and_pin_nft_metadata(data: dict, record) -> str:
    existing = data.get("nft_metadata_uri") or data.get("token_uri")
    if existing:
        return existing

    signed_credential = _parse_credential_json(record)
    if not signed_credential:
        raise IpfsUploadError("Cannot build NFT metadata: signed credential JSON missing")

    image_uri = data.get("attached_document") or ""
    if not image_uri:
        subject = signed_credential.get("credentialSubject") or {}
        if isinstance(subject, dict):
            image_uri = subject.get("attachedDocument") or ""

    return await pin_certificate_nft_metadata(
        signed_credential=signed_credential,
        credential_id=data.get("credential_id") or "",
        credential_type=data.get("type") or getattr(record, "type", None) or "UniversityCredential",
        issuer_did=data.get("issuer_did") or getattr(record, "issuer", None) or "",
        holder_did=data.get("holder_did") or getattr(record, "holder_did", None) or "",
        credential_hash=data.get("credential_hash") or getattr(record, "credential_hash", None) or "",
        image_uri=image_uri or None,
    )


def _holder_address_from_payload(data: dict, db, holder_did: str | None) -> str | None:
    holder_address = data.get("holder_address")
    if holder_address:
        return holder_address

    if holder_did:
        did_record = get_did_by_string(db, holder_did)
        if did_record and did_record.ethereum_address:
            return did_record.ethereum_address
        return eth_address_from_did(holder_did)

    return None


async def handle_cred_created(data):
    """
    Anchor a newly issued credential on CredentialRegistry, then mint a
    non-transferable CertificateSBT to the holder.
    """
    credential_id = data.get("credential_id")
    credential_hash = data.get("credential_hash")
    holder_did = data.get("holder_did")
    issuer_address = data.get("issuer_address")

    logger.info("Handling cred.created event for credential_id=%s", credential_id)

    settings = get_blockchain_settings()
    db = SessionLocal()
    try:
        record = get_credential_by_id(db, credential_id) if credential_id else None
        if not credential_hash and record and record.credential_hash:
            credential_hash = record.credential_hash

        if settings.require_credential_on_chain:
            if not credential_id or not credential_hash or not holder_did or not issuer_address:
                logger.error("cred.created payload missing required fields: %s", data)
            elif record and record.tx_hash:
                logger.info(
                    "Credential already anchored in DB id=%s tx=%s",
                    credential_id,
                    record.tx_hash,
                )
            else:
                try:
                    chain_result = register_credential_on_chain(
                        credential_id=credential_id,
                        credential_hash=credential_hash,
                        issuer_address=issuer_address,
                        holder_did=holder_did,
                    )
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
                    else:
                        logger.info(
                            "Credential on-chain anchor saved id=%s tx=%s block=%s",
                            credential_id,
                            chain_result["tx_hash"],
                            chain_result["block_number"],
                        )
                except CredentialRegistryError as exc:
                    if "already registered" in str(exc).lower():
                        logger.warning(
                            "Credential already on-chain, skipping register: %s",
                            credential_id,
                        )
                    else:
                        raise
        else:
            logger.info(
                "REQUIRE_CREDENTIAL_ON_CHAIN=false; skipping on-chain credential registration"
            )

        if not settings.require_certificate_sbt:
            logger.info(
                "REQUIRE_CERTIFICATE_SBT=false; skipping CertificateSBT mint"
            )
            return

        if not settings.certificate_sbt_address:
            logger.warning(
                "CERTIFICATE_SBT_ADDRESS is not configured; skipping CertificateSBT mint"
            )
            return

        if not credential_id or not credential_hash or not issuer_address:
            logger.error(
                "cred.created payload missing fields required for SBT mint: %s",
                data,
            )
            return

        record = get_credential_by_id(db, credential_id)
        if record and record.sbt_tx_hash:
            logger.info(
                "Certificate SBT already minted in DB id=%s token=%s tx=%s",
                credential_id,
                record.sbt_token_id,
                record.sbt_tx_hash,
            )
            return

        holder_address = _holder_address_from_payload(data, db, holder_did)
        if not holder_address:
            logger.error(
                "Cannot mint CertificateSBT without holder Ethereum address id=%s",
                credential_id,
            )
            return

        token_uri = ""
        try:
            token_uri = await _build_and_pin_nft_metadata(data, record)
            logger.info(
                "Certificate NFT metadata pinned id=%s uri=%s",
                credential_id,
                token_uri,
            )
        except Exception as exc:
            logger.exception(
                "Failed to pin certificate NFT metadata id=%s: %s",
                credential_id,
                exc,
            )
            fallback = _token_uri_from_payload(data, record)
            if not fallback:
                raise
            logger.warning(
                "Falling back to attached document URI for SBT mint id=%s uri=%s",
                credential_id,
                fallback,
            )
            token_uri = fallback

        try:
            sbt_result = mint_certificate_sbt_on_chain(
                holder_address=holder_address,
                credential_id=credential_id,
                credential_hash=credential_hash,
                issuer_address=issuer_address,
                token_uri=token_uri,
            )
        except CertificateSBTError as exc:
            if "already minted" in str(exc).lower():
                logger.warning(
                    "Certificate SBT already on-chain, syncing DB id=%s",
                    credential_id,
                )
                existing = get_certificate_sbt().get_certificate(credential_id)
                update_credential_sbt_anchor(
                    db=db,
                    credential_id=credential_id,
                    token_id=existing["token_id"],
                    tx_hash=(
                        record.sbt_tx_hash if record and record.sbt_tx_hash else None
                    ),
                    token_uri=existing.get("token_uri") or token_uri,
                )
                return
            raise

        updated = update_credential_sbt_anchor(
            db=db,
            credential_id=credential_id,
            token_id=sbt_result["token_id"],
            tx_hash=sbt_result["tx_hash"],
            token_uri=sbt_result.get("token_uri") or token_uri,
        )
        if not updated:
            logger.error(
                "Credential row not found while saving SBT anchor id=%s",
                credential_id,
            )
            return

        logger.info(
            "Certificate SBT saved id=%s token=%s tx=%s uri=%s",
            credential_id,
            sbt_result["token_id"],
            sbt_result["tx_hash"],
            sbt_result.get("token_uri") or token_uri,
        )
    except Exception as exc:
        logger.exception(
            "Failed to process cred.created on-chain id=%s: %s",
            credential_id,
            exc,
        )
        raise
    finally:
        db.close()


async def handle_cred_revoked(data):
    """
    Revoke a credential on CredentialRegistry and mark the CertificateSBT revoked.
    """
    credential_id = data.get("credential_id")
    reason_code = int(data.get("reason_code") or 0)

    logger.info("Handling cred.revoked event for credential_id=%s", credential_id)

    settings = get_blockchain_settings()
    db = SessionLocal()
    try:
        record = get_credential_by_id(db, credential_id) if credential_id else None

        if settings.require_credential_on_chain:
            if not credential_id:
                logger.error("cred.revoked payload missing credential_id: %s", data)
            elif record and record.revoke_tx_hash:
                logger.info(
                    "Credential already revoked on-chain in DB id=%s tx=%s",
                    credential_id,
                    record.revoke_tx_hash,
                )
            else:
                try:
                    chain_result = revoke_credential_on_chain(
                        credential_id=credential_id,
                        reason_code=reason_code,
                    )
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
                    else:
                        logger.info(
                            "Credential on-chain revocation saved id=%s tx=%s block=%s",
                            credential_id,
                            chain_result["tx_hash"],
                            chain_result["block_number"],
                        )
                except CredentialRegistryError as exc:
                    message = str(exc).lower()
                    if "already revoked" in message:
                        logger.warning(
                            "Credential already revoked on-chain, skipping: %s",
                            credential_id,
                        )
                    else:
                        raise
        else:
            logger.info(
                "REQUIRE_CREDENTIAL_ON_CHAIN=false; skipping on-chain credential revocation"
            )

        if not settings.require_certificate_sbt:
            logger.info(
                "REQUIRE_CERTIFICATE_SBT=false; skipping CertificateSBT revocation"
            )
            return

        if not settings.certificate_sbt_address:
            logger.warning(
                "CERTIFICATE_SBT_ADDRESS is not configured; skipping CertificateSBT revocation"
            )
            return

        if not credential_id:
            logger.error("cred.revoked payload missing credential_id: %s", data)
            return

        record = get_credential_by_id(db, credential_id)
        if record and record.sbt_revoke_tx_hash:
            logger.info(
                "Certificate SBT already revoked in DB id=%s tx=%s",
                credential_id,
                record.sbt_revoke_tx_hash,
            )
            return

        try:
            sbt_result = revoke_certificate_sbt_on_chain(credential_id=credential_id)
        except CertificateSBTError as exc:
            message = str(exc).lower()
            if "already revoked" in message:
                logger.warning(
                    "Certificate SBT already revoked on-chain, skipping: %s",
                    credential_id,
                )
                return
            if "not minted" in message:
                logger.warning(
                    "No CertificateSBT minted for credential, skipping revoke: %s",
                    credential_id,
                )
                return
            raise

        updated = update_credential_sbt_revoke_anchor(
            db=db,
            credential_id=credential_id,
            sbt_revoke_tx_hash=sbt_result["tx_hash"],
        )
        if not updated:
            logger.error(
                "Credential row not found while saving SBT revoke anchor id=%s",
                credential_id,
            )
            return

        logger.info(
            "Certificate SBT revocation saved id=%s token=%s tx=%s",
            credential_id,
            sbt_result.get("token_id"),
            sbt_result["tx_hash"],
        )
    except Exception as exc:
        logger.exception(
            "Failed to process cred.revoked on-chain id=%s: %s",
            credential_id,
            exc,
        )
        raise
    finally:
        db.close()
