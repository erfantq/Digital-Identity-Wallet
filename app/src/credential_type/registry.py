from typing import Any

from eth_account import Account
from web3 import Web3

from app.src.blockchain.config import (
    get_blockchain_settings,
    get_web3,
    load_contract_abi,
)
from app.src.credential_type.repository import type_id_hash


class CredentialTypeRegistryError(Exception):
    """Raised when CredentialTypeRegistry interaction fails."""


class CredentialTypeRegistryService:
    def __init__(self) -> None:
        self.settings = get_blockchain_settings()
        if not self.settings.credential_type_registry_address:
            raise CredentialTypeRegistryError(
                "CREDENTIAL_TYPE_REGISTRY_ADDRESS is not configured"
            )

        self.web3 = get_web3()
        self.address = Web3.to_checksum_address(
            self.settings.credential_type_registry_address
        )
        self.contract = self.web3.eth.contract(
            address=self.address,
            abi=load_contract_abi("CredentialTypeRegistry"),
        )

    def register_credential_type(
        self,
        type_id: str,
        revocable: bool,
        schema_hash: str,
    ) -> dict[str, Any]:
        type_hash = type_id_hash(type_id)
        schema = bytes.fromhex(
            schema_hash[2:] if schema_hash.startswith("0x") else schema_hash
        )
        if len(schema) != 32:
            raise CredentialTypeRegistryError("schema_hash must be 32 bytes")

        if self.type_exists(type_id):
            raise CredentialTypeRegistryError(
                f"Credential type already registered on-chain: {type_id}"
            )

        return self._send_tx(
            self.contract.functions.registerCredentialType(
                type_hash,
                revocable,
                schema,
            )
        )

    def type_exists(self, type_id: str) -> bool:
        type_hash = type_id_hash(type_id)
        try:
            return bool(self.contract.functions.typeExists(type_hash).call())
        except Exception:
            return False

    def is_revocable(self, type_id: str) -> bool:
        type_hash = type_id_hash(type_id)
        return bool(self.contract.functions.isRevocable(type_hash).call())

    def get_type(self, type_id: str) -> dict[str, Any]:
        type_hash = type_id_hash(type_id)
        exists, revocable, schema_hash, registered_at = (
            self.contract.functions.getType(type_hash).call()
        )
        return {
            "type_id": type_id,
            "type_id_hash": Web3.to_hex(type_hash),
            "exists": bool(exists),
            "revocable": bool(revocable),
            "schema_hash": Web3.to_hex(schema_hash),
            "registered_at": int(registered_at),
        }

    def _get_owner_account(self):
        private_key = self.settings.trust_admin_private_key
        if not private_key:
            raise CredentialTypeRegistryError(
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
                "gas": 400_000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None) or signed.rawTransaction
        tx_hash = self.web3.eth.send_raw_transaction(raw_tx)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            raise CredentialTypeRegistryError(
                f"CredentialTypeRegistry transaction failed: {tx_hash.hex()}"
            )
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": int(receipt.blockNumber),
        }


def get_credential_type_registry() -> CredentialTypeRegistryService:
    return CredentialTypeRegistryService()
