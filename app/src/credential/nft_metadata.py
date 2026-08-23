from typing import Any

from .ipfsService import upload_json_to_ipfs


_SKIP_SUBJECT_KEYS = {"id", "attachedDocument"}


def build_certificate_nft_metadata(
    *,
    signed_credential: dict[str, Any],
    credential_id: str,
    credential_type: str,
    issuer_did: str,
    holder_did: str,
    credential_hash: str,
    image_uri: str | None = None,
) -> dict[str, Any]:
    """
    ERC-721 metadata for a soulbound certificate NFT.

    The JSON is pinned to IPFS and used as tokenURI so wallets/explorers
    render the certificate itself, not only a hash.
    """
    subject = signed_credential.get("credentialSubject") or {}
    if not isinstance(subject, dict):
        subject = {}

    attributes: list[dict[str, Any]] = [
        {"trait_type": "Credential Type", "value": credential_type},
        {"trait_type": "Issuer", "value": issuer_did},
        {"trait_type": "Holder", "value": holder_did},
        {"trait_type": "Soulbound", "value": "true"},
    ]
    for key, value in subject.items():
        if key in _SKIP_SUBJECT_KEYS:
            continue
        attributes.append(
            {
                "trait_type": key,
                "value": value
                if isinstance(value, (str, int, float, bool)) or value is None
                else str(value),
            }
        )

    display_name = (
        subject.get("firstName") and subject.get("lastName")
        and f"{subject['firstName']} {subject['lastName']}"
    )
    name = (
        f"{credential_type} — {display_name}"
        if display_name
        else credential_type or "University Certificate"
    )

    metadata: dict[str, Any] = {
        "name": name,
        "description": (
            "Non-transferable (soulbound) university certificate NFT. "
            f"Credential ID: {credential_id}"
        ),
        "attributes": attributes,
        "properties": {
            "credentialId": credential_id,
            "credentialHash": credential_hash,
            "issuerDid": issuer_did,
            "holderDid": holder_did,
            "soulbound": True,
            "document": image_uri or "",
        },
        "credential": signed_credential,
    }
    if image_uri:
        metadata["image"] = image_uri
        metadata["document"] = image_uri

    return metadata


async def pin_certificate_nft_metadata(
    *,
    signed_credential: dict[str, Any],
    credential_id: str,
    credential_type: str,
    issuer_did: str,
    holder_did: str,
    credential_hash: str,
    image_uri: str | None = None,
) -> str:
    """Build ERC-721 metadata and pin it to IPFS. Returns ipfs://<cid>."""
    metadata = build_certificate_nft_metadata(
        signed_credential=signed_credential,
        credential_id=credential_id,
        credential_type=credential_type,
        issuer_did=issuer_did,
        holder_did=holder_did,
        credential_hash=credential_hash,
        image_uri=image_uri,
    )
    name = f"certificate-{(credential_id or 'nft').replace(':', '-')}"
    return await upload_json_to_ipfs(metadata, name=name)
