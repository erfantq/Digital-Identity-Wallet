from typing import Any

from web3 import Web3

from app.src.blockchain.config import get_blockchain_settings
from app.src.credential.cryptography import (
    calculate_credential_hash,
    eth_address_from_did,
    recover_signer_address,
)
from app.src.credential.registry import (
    CredentialRegistryError,
    get_credential_registry,
    holder_did_hash_from_string,
)
from app.src.did.registry import DIDRegistryError, get_did_registry
from app.src.did.repository import get_did_by_string
from app.src.trust.registry import (
    TrustedEntityRegistryError,
    get_trusted_entity_registry,
)


def _resolve_issuer_address(issuer_did: str, db) -> str | None:
    did_record = get_did_by_string(db, issuer_did) if db is not None else None
    if did_record and did_record.ethereum_address:
        try:
            return Web3.to_checksum_address(did_record.ethereum_address)
        except Exception:
            pass

    parsed = eth_address_from_did(issuer_did)
    if parsed:
        return parsed

    settings = get_blockchain_settings()
    if settings.did_registry_address:
        try:
            on_chain = get_did_registry().get_did_record(issuer_did)
            return Web3.to_checksum_address(on_chain["controller"])
        except Exception:
            return None

    return None


def verify_credential(credential: dict[str, Any], db=None) -> dict[str, Any]:
    """
    Verify a signed VC for a Relying Party.

    Checks (in order):
    1. EIP-191 signature
    2. issuer DID active on DIDRegistry
    3. issuer authorized on TrustedEntityRegistry
    4. credential anchored on CredentialRegistry
    5. credential hash matches on-chain record
    6. credential not revoked on-chain
    """
    checks: dict[str, bool | None] = {
        "signature": None,
        "did_active": None,
        "issuer_trusted": None,
        "issued_on_chain": None,
        "hash_match": None,
        "not_revoked": None,
        "holder_match": None,
    }
    errors: list[str] = []
    details: dict[str, Any] = {}

    if not isinstance(credential, dict):
        return {
            "valid": False,
            "checks": checks,
            "errors": ["Credential must be a JSON object"],
            "details": details,
        }

    credential_id = credential.get("id")
    issuer_did = credential.get("issuer")
    subject = credential.get("credentialSubject") or {}
    holder_did = subject.get("id") if isinstance(subject, dict) else None

    details["credential_id"] = credential_id
    details["issuer_did"] = issuer_did
    details["holder_did"] = holder_did

    if not credential_id or not issuer_did:
        errors.append("Credential missing required fields: id and/or issuer")
        return {"valid": False, "checks": checks, "errors": errors, "details": details}

    settings = get_blockchain_settings()

    # 1) Signature
    try:
        recovered_address = Web3.to_checksum_address(
            recover_signer_address(credential)
        )
        details["recovered_signer"] = recovered_address

        issuer_address = _resolve_issuer_address(issuer_did, db)
        details["issuer_address"] = issuer_address

        if not issuer_address:
            checks["signature"] = False
            errors.append("Unable to resolve issuer Ethereum address from DID")
        elif recovered_address.lower() != issuer_address.lower():
            checks["signature"] = False
            errors.append(
                "Signature does not match issuer address "
                f"(recovered={recovered_address}, issuer={issuer_address})"
            )
        else:
            checks["signature"] = True
    except Exception as exc:
        checks["signature"] = False
        errors.append(f"Signature verification failed: {exc}")

    # 2) Issuer DID active
    if settings.check_did_on_chain_resolve:
        if not settings.did_registry_address:
            checks["did_active"] = False
            errors.append("DID_REGISTRY_ADDRESS is not configured")
        else:
            try:
                did_active = get_did_registry().is_active(issuer_did)
                checks["did_active"] = did_active
                if not did_active:
                    errors.append("Issuer DID is not active on DIDRegistry")
            except DIDRegistryError as exc:
                checks["did_active"] = False
                errors.append(f"DIDRegistry check failed: {exc}")
            except Exception as exc:
                checks["did_active"] = False
                errors.append(f"DIDRegistry check failed: {exc}")
    else:
        checks["did_active"] = None

    # 3) Trusted issuer
    issuer_for_trust = details.get("issuer_address") or details.get("recovered_signer")
    if settings.require_trusted_issuer:
        if not settings.trusted_entity_registry_address:
            checks["issuer_trusted"] = False
            errors.append("TRUSTED_ENTITY_REGISTRY_ADDRESS is not configured")
        elif not issuer_for_trust:
            checks["issuer_trusted"] = False
            errors.append("Cannot check TrustedEntityRegistry without issuer address")
        else:
            try:
                trusted = get_trusted_entity_registry().is_authorized_issuer(
                    issuer_for_trust
                )
                checks["issuer_trusted"] = trusted
                if not trusted:
                    errors.append(
                        "Issuer is not authorized in TrustedEntityRegistry"
                    )
            except TrustedEntityRegistryError as exc:
                checks["issuer_trusted"] = False
                errors.append(f"TrustedEntityRegistry check failed: {exc}")
            except Exception as exc:
                checks["issuer_trusted"] = False
                errors.append(f"TrustedEntityRegistry check failed: {exc}")
    else:
        checks["issuer_trusted"] = None

    # 4-6) CredentialRegistry: issued, hash, revocation, holder
    if settings.check_credential_on_chain_verify:
        if not settings.credential_registry_address:
            checks["issued_on_chain"] = False
            checks["hash_match"] = False
            checks["not_revoked"] = False
            errors.append("CREDENTIAL_REGISTRY_ADDRESS is not configured")
        else:
            try:
                registry = get_credential_registry()
                if not registry.is_registered(credential_id):
                    checks["issued_on_chain"] = False
                    checks["hash_match"] = False
                    checks["not_revoked"] = False
                    checks["holder_match"] = False
                    errors.append(
                        "Credential is not registered on CredentialRegistry"
                    )
                else:
                    on_chain = registry.get_credential_record(credential_id)
                    details["on_chain"] = on_chain
                    checks["issued_on_chain"] = True

                    local_hash = calculate_credential_hash(credential)
                    details["credential_hash"] = local_hash
                    hash_match = (
                        local_hash.lower() == on_chain["credential_hash"].lower()
                    )
                    checks["hash_match"] = hash_match
                    if not hash_match:
                        errors.append(
                            "Credential hash does not match on-chain CredentialRegistry record"
                        )

                    not_revoked = not on_chain["revoked"]
                    checks["not_revoked"] = not_revoked
                    if not not_revoked:
                        errors.append("Credential is revoked on-chain")

                    if holder_did:
                        expected_holder_hash = Web3.to_hex(
                            holder_did_hash_from_string(holder_did)
                        )
                        holder_match = (
                            expected_holder_hash.lower()
                            == on_chain["holder_did_hash"].lower()
                        )
                        checks["holder_match"] = holder_match
                        if not holder_match:
                            errors.append(
                                "Holder DID hash does not match on-chain record"
                            )
                    else:
                        checks["holder_match"] = False
                        errors.append(
                            "credentialSubject.id (holder DID) is missing"
                        )

                    on_chain_issuer = on_chain.get("issuer")
                    signer = details.get("recovered_signer")
                    if on_chain_issuer and signer:
                        if on_chain_issuer.lower() != signer.lower():
                            errors.append(
                                "Recovered signer does not match on-chain credential issuer"
                            )
                            checks["signature"] = False
            except CredentialRegistryError as exc:
                checks["issued_on_chain"] = False
                checks["hash_match"] = False
                checks["not_revoked"] = False
                errors.append(f"CredentialRegistry check failed: {exc}")
            except Exception as exc:
                checks["issued_on_chain"] = False
                checks["hash_match"] = False
                checks["not_revoked"] = False
                errors.append(f"CredentialRegistry check failed: {exc}")
    else:
        checks["issued_on_chain"] = None
        checks["hash_match"] = None
        checks["not_revoked"] = None
        checks["holder_match"] = None

    required_passed = all(
        value is not False for value in checks.values() if value is not None
    )
    valid = required_passed and len(errors) == 0

    return {
        "valid": valid,
        "checks": checks,
        "errors": errors,
        "details": details,
    }
