from typing import Any

from eth_account import Account
from web3 import Web3

from app.src.blockchain.config import (
    get_blockchain_settings,
    get_web3,
    load_contract_abi,
)


class DIDRegistryError(Exception):
    """Raised when DIDRegistry interaction fails."""


def _to_bytes32(value: str | bytes) -> bytes:
    if isinstance(value, (bytes, bytearray)):
        raw = bytes(value)
    else:
        hex_value = value[2:] if value.startswith("0x") else value
        raw = bytes.fromhex(hex_value)

    if len(raw) != 32:
        raise DIDRegistryError(f"Expected 32-byte hash, got {len(raw)} bytes")
    return raw


def did_hash_from_string(did: str) -> bytes:
    return Web3.keccak(text=did)


class DIDRegistryService:
    def __init__(self) -> None:
        self.settings = get_blockchain_settings()
        if not self.settings.did_registry_address:
            raise DIDRegistryError("DID_REGISTRY_ADDRESS is not configured")

        self.web3 = get_web3()
        self.address = Web3.to_checksum_address(self.settings.did_registry_address)
        self.contract = self.web3.eth.contract(
            address=self.address,
            abi=load_contract_abi("DIDRegistry"),
        )

    def register_did(
        self,
        did: str,
        controller: str,
        document_hash: str,
    ) -> dict[str, Any]:
        did_hash = did_hash_from_string(did)
        controller_address = Web3.to_checksum_address(controller)
        doc_hash = _to_bytes32(document_hash)

        if self.is_active(did):
            raise DIDRegistryError(f"DID already registered on-chain: {did}")

        return self._send_tx(
            self.contract.functions.registerDid(
                did_hash,
                controller_address,
                doc_hash,
            )
        )

    def deactivate_did(self, did: str) -> dict[str, Any]:
        did_hash = did_hash_from_string(did)
        return self._send_tx(self.contract.functions.deactivateDid(did_hash))

    def is_active(self, did: str) -> bool:
        did_hash = did_hash_from_string(did)
        return bool(self.contract.functions.isActive(did_hash).call())

    def get_did_record(self, did: str) -> dict[str, Any]:
        did_hash = did_hash_from_string(did)
        controller, document_hash, active, registered_at = (
            self.contract.functions.getDidRecord(did_hash).call()
        )
        return {
            "did": did,
            "did_hash": Web3.to_hex(did_hash),
            "controller": controller,
            "document_hash": Web3.to_hex(document_hash),
            "active": bool(active),
            "registered_at": int(registered_at),
        }

    def _get_owner_account(self):
        private_key = self.settings.trust_admin_private_key
        if not private_key:
            raise DIDRegistryError("BESU_TRUST_ADMIN_PRIVATE_KEY is not configured")
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
            raise DIDRegistryError(
                f"DIDRegistry transaction failed: {tx_hash.hex()}"
            )
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": int(receipt.blockNumber),
        }


def get_did_registry() -> DIDRegistryService:
    return DIDRegistryService()
