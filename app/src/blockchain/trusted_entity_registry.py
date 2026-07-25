from typing import Any

from eth_account import Account
from web3 import Web3

from app.src.blockchain.config import (
    get_blockchain_settings,
    get_web3,
    load_contract_abi,
)


class TrustedEntityRegistryError(Exception):
    """Raised when TrustedEntityRegistry interaction fails."""


class TrustedEntityRegistryService:
    def __init__(self) -> None:
        self.settings = get_blockchain_settings()
        if not self.settings.trusted_entity_registry_address:
            raise TrustedEntityRegistryError(
                "TRUSTED_ENTITY_REGISTRY_ADDRESS is not configured"
            )

        self.web3 = get_web3()
        self.address = Web3.to_checksum_address(
            self.settings.trusted_entity_registry_address
        )
        self.contract = self.web3.eth.contract(
            address=self.address,
            abi=load_contract_abi("TrustedEntityRegistry"),
        )

    def is_authorized_issuer(self, account: str) -> bool:
        checksum = Web3.to_checksum_address(account)
        return bool(self.contract.functions.isAuthorizedIssuer(checksum).call())

    def authorize_issuer(self, account: str) -> dict[str, Any]:
        checksum = Web3.to_checksum_address(account)
        tx_hash = self._send_tx(self.contract.functions.authorizeIssuer(checksum))
        return {"tx_hash": tx_hash, "account": checksum}

    def revoke_issuer(self, account: str) -> dict[str, Any]:
        checksum = Web3.to_checksum_address(account)
        tx_hash = self._send_tx(self.contract.functions.revokeIssuer(checksum))
        return {"tx_hash": tx_hash, "account": checksum}

    def _get_owner_account(self):
        private_key = self.settings.trust_admin_private_key
        if not private_key:
            raise TrustedEntityRegistryError(
                "BESU_TRUST_ADMIN_PRIVATE_KEY is not configured"
            )
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        return Account.from_key(private_key)

    def _send_tx(self, contract_function) -> str:
        account = self._get_owner_account()
        nonce = self.web3.eth.get_transaction_count(account.address)
        tx = contract_function.build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "chainId": self.settings.chain_id,
                "gas": 200_000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None) or signed.rawTransaction
        tx_hash = self.web3.eth.send_raw_transaction(raw_tx)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            raise TrustedEntityRegistryError(
                f"TrustedEntityRegistry transaction failed: {tx_hash.hex()}"
            )
        return tx_hash.hex()


def get_trusted_entity_registry() -> TrustedEntityRegistryService:
    return TrustedEntityRegistryService()
