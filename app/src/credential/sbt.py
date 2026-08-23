from typing import Any

from eth_account import Account
from web3 import Web3

from app.src.blockchain.config import (
    get_blockchain_settings,
    get_web3,
    load_contract_abi,
)
from app.src.credential.registry import (
    _to_bytes32,
    credential_id_hash_from_string,
)


class CertificateSBTError(Exception):
    """Raised when CertificateSBT interaction fails."""


class CertificateSBTService:
    def __init__(self) -> None:
        self.settings = get_blockchain_settings()
        if not self.settings.certificate_sbt_address:
            raise CertificateSBTError("CERTIFICATE_SBT_ADDRESS is not configured")

        self.web3 = get_web3()
        self.address = Web3.to_checksum_address(self.settings.certificate_sbt_address)
        self.contract = self.web3.eth.contract(
            address=self.address,
            abi=load_contract_abi("CertificateSBT"),
        )

    def mint_certificate(
        self,
        holder_address: str,
        credential_id: str,
        credential_hash: str,
        issuer: str,
        token_uri: str = "",
    ) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        cred_hash = _to_bytes32(credential_hash)
        to_address = Web3.to_checksum_address(holder_address)
        issuer_address = Web3.to_checksum_address(issuer)

        if not token_uri:
            raise CertificateSBTError(
                "token_uri is required: pin ERC-721 certificate metadata before mint"
            )

        if self.is_minted(credential_id):
            raise CertificateSBTError(
                f"Certificate already minted on-chain: {credential_id}"
            )

        result = self._send_tx(
            self.contract.functions.mintCertificate(
                to_address,
                credential_id_hash,
                cred_hash,
                issuer_address,
                token_uri or "",
            )
        )
        token_id = int(
            self.contract.functions.tokenIdOf(credential_id_hash).call()
        )
        result["token_id"] = token_id
        result["token_uri"] = token_uri or ""
        return result

    def revoke_certificate(self, credential_id: str) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        record = self.get_certificate(credential_id)
        if record["revoked"]:
            raise CertificateSBTError(
                f"Certificate already revoked on-chain: {credential_id}"
            )

        result = self._send_tx(
            self.contract.functions.revokeCertificate(credential_id_hash)
        )
        result["token_id"] = record["token_id"]
        return result

    def is_minted(self, credential_id: str) -> bool:
        try:
            self.get_certificate(credential_id)
            return True
        except CertificateSBTError:
            return False
        except Exception:
            return False

    def get_certificate(self, credential_id: str) -> dict[str, Any]:
        credential_id_hash = credential_id_hash_from_string(credential_id)
        try:
            (
                token_id,
                token_owner,
                cred_hash,
                issuer,
                minted_at,
                revoked_at,
                uri,
            ) = self.contract.functions.getCertificate(credential_id_hash).call()
        except Exception as exc:
            raise CertificateSBTError(
                f"Certificate not minted on-chain: {credential_id}"
            ) from exc

        return {
            "credential_id": credential_id,
            "credential_id_hash": Web3.to_hex(credential_id_hash),
            "token_id": int(token_id),
            "owner": token_owner,
            "credential_hash": Web3.to_hex(cred_hash),
            "issuer": issuer,
            "minted_at": int(minted_at),
            "revoked_at": int(revoked_at),
            "revoked": int(revoked_at) > 0,
            "token_uri": uri,
        }

    def _get_owner_account(self):
        private_key = self.settings.trust_admin_private_key
        if not private_key:
            raise CertificateSBTError(
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
                "gas": 2_500_000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None) or signed.rawTransaction
        tx_hash = self.web3.eth.send_raw_transaction(raw_tx)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            raise CertificateSBTError(
                f"CertificateSBT transaction failed: {tx_hash.hex()}"
            )
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": int(receipt.blockNumber),
        }


def get_certificate_sbt() -> CertificateSBTService:
    return CertificateSBTService()
