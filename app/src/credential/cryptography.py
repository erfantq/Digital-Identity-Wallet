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