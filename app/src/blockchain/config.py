import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

load_dotenv()


ABI_DIR = Path(__file__).resolve().parent / "abis"


class BlockchainSettings:
    def __init__(self) -> None:
        self.rpc_url = os.getenv("BESU_RPC_URL", "http://127.0.0.1:8545")
        self.chain_id = int(os.getenv("BESU_CHAIN_ID", "1337"))
        self.trusted_entity_registry_address = os.getenv(
            "TRUSTED_ENTITY_REGISTRY_ADDRESS",
            "",
        )
        self.did_registry_address = os.getenv("DID_REGISTRY_ADDRESS", "")
        self.credential_registry_address = os.getenv(
            "CREDENTIAL_REGISTRY_ADDRESS",
            "",
        )
        # Private key that owns registry contracts on Besu
        self.trust_admin_private_key = os.getenv("BESU_TRUST_ADMIN_PRIVATE_KEY", "")
        self.require_trusted_issuer = (
            os.getenv("REQUIRE_TRUSTED_ISSUER", "true").lower() == "true"
        )
        self.require_did_on_chain = (
            os.getenv("REQUIRE_DID_ON_CHAIN", "true").lower() == "true"
        )
        self.require_credential_on_chain = (
            os.getenv("REQUIRE_CREDENTIAL_ON_CHAIN", "true").lower() == "true"
        )
        self.check_did_on_chain_resolve = (
            os.getenv("CHECK_DID_ON_CHAIN_RESOLVE", "true").lower() == "true"
        )
        self.check_credential_on_chain_verify = (
            os.getenv("CHECK_CREDENTIAL_ON_CHAIN_VERIFY", "true").lower() == "true"
        )


@lru_cache(maxsize=1)
def get_blockchain_settings() -> BlockchainSettings:
    return BlockchainSettings()


@lru_cache(maxsize=1)
def get_web3() -> Web3:
    settings = get_blockchain_settings()
    web3 = Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 30}))
    if not web3.is_connected():
        raise RuntimeError(f"Cannot connect to Besu RPC at {settings.rpc_url}")
    return web3


def load_contract_abi(name: str) -> list:
    abi_path = ABI_DIR / f"{name}.json"
    if not abi_path.exists():
        raise FileNotFoundError(f"Contract ABI not found: {abi_path}")
    with abi_path.open("r", encoding="utf-8") as f:
        return json.load(f)
