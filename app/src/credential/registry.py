from typing import Any

from eth_account import Account
from web3 import Web3

from app.src.blockchain.config import (
    get_blockchain_settings,
    get_web3,
    load_contract_abi,
)


class CredentialRegistryError(Exception):
    """Raised when CredentialRegistry interaction fails."""


def _to_bytes32(value: str | bytes) -> bytes:
    if isinstance(value, (bytes, bytearray)):
        raw = bytes(value)
    else:
        hex_value = value[2:] if value.startswith("0x") else value
        raw = bytes.fromhex(hex_value)

    if len(raw) != 32:
        raise CredentialRegistryError(f"Expected 32-byte hash, got {len(raw)} bytes")
    return raw


def credential_id_hash_from_string(credential_id: str) -> bytes:
    return Web3.keccak(text=credential_id)


def holder_did_hash_from_string(holder_did: str) -> bytes:
    return Web3.keccak(text=holder_did)


class CredentialRegistryService:
    def __init__(self) -> None:
        self.settings = get_blockchain_settings()
        if not self.settings.credential_registry_address:
            raise CredentialRegistryError(
                "CREDENTIAL_REGISTRY_ADDRESS is not configured"
            )

        self.web3 = get_web3()
        self.address = Web3.to_checksum_address(
            self.settings.credential_registry_address
        )
        self.contract = self.web3.eth.contract(
            address=self.address,
            abi=load_contract_abi("CredentialRegistry"),
        )

    def register_credential(
        self,
        credential_id: str,
        credential_hash: str,
        issuer: str,
        holder_did: str,
    ) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        cred_hash = _to_bytes32(credential_hash)
        issuer_address = Web3.to_checksum_address(issuer)
        holder_hash = holder_did_hash_from_string(holder_did)

        if self.is_registered(credential_id):
            raise CredentialRegistryError(
                f"Credential already registered on-chain: {credential_id}"
            )

        return self._send_tx(
            self.contract.functions.registerCredential(
                credential_id_hash,
                cred_hash,
                issuer_address,
                holder_hash,
            )
        )

    def is_registered(self, credential_id: str) -> bool:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        try:
            record = self.contract.functions.getCredentialRecord(
                credential_id_hash
            ).call()
            return int(record[3]) > 0
        except Exception:
            return False

    def get_credential_record(self, credential_id: str) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        cred_hash, issuer, holder_hash, issued_at, revoked_at, reason_code = (
            self.contract.functions.getCredentialRecord(credential_id_hash).call()
        )
        return {
            "credential_id": credential_id,
            "credential_id_hash": Web3.to_hex(credential_id_hash),
            "credential_hash": Web3.to_hex(cred_hash),
            "issuer": issuer,
            "holder_did_hash": Web3.to_hex(holder_hash),
            "issued_at": int(issued_at),
            "revoked_at": int(revoked_at),
            "reason_code": int(reason_code),
            "revoked": int(revoked_at) > 0,
        }

    def revoke_credential(
        self,
        credential_id: str,
        reason_code: int = 0,
    ) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        record = self.get_credential_record(credential_id)
        if record["revoked"]:
            raise CredentialRegistryError(
                f"Credential already revoked on-chain: {credential_id}"
            )

        return self._send_tx(
            self.contract.functions.revokeCredential(
                credential_id_hash,
                reason_code,
            )
        )

    def _get_owner_account(self):
        private_key = self.settings.trust_admin_private_key
        if not private_key:
            raise CredentialRegistryError(
                "BESU_TRUST_ADMIN_PRIVATE_KEY is not configured"
            )
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        return Account.from_key(private_key)

    def _send_tx(self, contract_function) -> dict[str, Any]:
        account = self._get_owner_account()
        nonce = self.web3.eth.get_transaction_count(account.address)
        tx = contract_function.build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "chainId": self.settings.chain_id,
                "gas": 300_000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None) or signed.rawTransaction
        tx_hash = self.web3.eth.send_raw_transaction(raw_tx)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            raise CredentialRegistryError(
                f"CredentialRegistry transaction failed: {tx_hash.hex()}"
            )
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": int(receipt.blockNumber),
        }


def get_credential_registry() -> CredentialRegistryService:
    return CredentialRegistryService()
