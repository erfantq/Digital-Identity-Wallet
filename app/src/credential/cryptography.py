import json
from datetime import datetime, timezone
from typing import Any

from eth_utils import keccak
from eth_account import Account
from eth_account.messages import encode_defunct


def canonical_json(data: dict[str, Any]) -> str:
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def sign_credential_with_private_key(
    credential: dict[str, Any],
    private_key: str,
    verification_method: str,
) -> dict[str, Any]:
    credential_without_proof = credential.copy()
    credential_without_proof.pop("proof", None)

    message = canonical_json(credential_without_proof)

    encoded_message = encode_defunct(text=message)
    signed_message = Account.sign_message(
        encoded_message,
        private_key=private_key,
    )

    signed_credential = credential_without_proof.copy()

    signed_credential["proof"] = {
        "type": "EthereumEip191Signature2026",
        "created": datetime.now(timezone.utc).isoformat(),
        "proofPurpose": "assertionMethod",
        "verificationMethod": verification_method,
        "signature": "0x" + signed_message.signature.hex(),
    }

    return signed_credential


def calculate_credential_hash(signed_credential: dict) -> str:
    canonical = canonical_json(signed_credential)
    return "0x" + keccak(text=canonical).hex()


def recover_signer_address(signed_credential: dict[str, Any]) -> str:
    """
    Recover the Ethereum address that signed the VC (EIP-191).
    The signed payload is the canonical JSON of the credential without `proof`.
    """
    proof = signed_credential.get("proof")
    if not isinstance(proof, dict):
        raise ValueError("Credential proof is missing")

    signature = proof.get("signature")
    if not signature or not isinstance(signature, str):
        raise ValueError("Credential proof.signature is missing")

    credential_without_proof = {
        key: value for key, value in signed_credential.items() if key != "proof"
    }
    message = canonical_json(credential_without_proof)
    encoded_message = encode_defunct(text=message)
    return Account.recover_message(encoded_message, signature=signature)


def eth_address_from_did(did: str) -> str | None:
    """
    Extract Ethereum address from project DID format:
    did:ethr:{user_id}:{address} or did:ethr:{address}
    """
    if not did or not isinstance(did, str):
        return None

    parts = did.split(":")
    if len(parts) < 3:
        return None

    candidate = parts[-1]
    if not candidate.startswith("0x") or len(candidate) != 42:
        return None

    try:
        from web3 import Web3

        return Web3.to_checksum_address(candidate)
    except Exception:
        return None
