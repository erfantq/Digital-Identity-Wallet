import os
from dataclasses import dataclass

from bip_utils import (
    Bip39SeedGenerator,
    Bip39MnemonicValidator,
    Bip39Languages,
    Bip44,
    Bip44Coins,
    Bip44Changes,
)


@dataclass
class DerivedWallet:
    wallet_index: int
    derivation_path: str
    private_key: str
    public_key: str
    address: str


def get_master_mnemonic() -> str:
    mnemonic = os.getenv("MASTER_WALLET_MNEMONIC")

    if not mnemonic:
        raise RuntimeError("MASTER_WALLET_MNEMONIC is not set in environment variables.")

    mnemonic = mnemonic.strip()

    Bip39MnemonicValidator(Bip39Languages.ENGLISH).Validate(mnemonic)

    return mnemonic


def derive_wallet_from_index(wallet_index: int) -> DerivedWallet:
    if wallet_index < 0:
        raise ValueError("wallet_index must be a non-negative integer.")

    mnemonic = get_master_mnemonic()

    seed_bytes = Bip39SeedGenerator(mnemonic).Generate()

    bip44_ctx = Bip44.FromSeed(seed_bytes, Bip44Coins.ETHEREUM)

    address_ctx = (
        bip44_ctx
        .Purpose()
        .Coin()
        .Account(0)
        .Change(Bip44Changes.CHAIN_EXT)
        .AddressIndex(wallet_index)
    )

    private_key = "0x" + address_ctx.PrivateKey().Raw().ToHex()
    public_key = "0x" + address_ctx.PublicKey().RawCompressed().ToHex()
    address = address_ctx.PublicKey().ToAddress()

    derivation_path = f"m/44'/60'/0'/0/{wallet_index}"

    return DerivedWallet(
        wallet_index=wallet_index,
        derivation_path=derivation_path,
        private_key=private_key,
        public_key=public_key,
        address=address,
    )