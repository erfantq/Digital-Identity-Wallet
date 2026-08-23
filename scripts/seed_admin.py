#!/usr/bin/env python3
"""
Bootstrap an admin user with wallet, DID, on-chain anchor, and issuer authorization.

Creates the user directly in the database (no RabbitMQ dependency), then builds the
DID document and optionally anchors it on Besu and authorizes the wallet on
TrustedEntityRegistry.

Usage (from repo root):

    python scripts/seed_admin.py
    python scripts/seed_admin.py --username admin --password admin123 --email admin@example.com
    python scripts/seed_admin.py --skip-chain

Inside Docker:

    docker compose exec backend python scripts/seed_admin.py
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app.src.auth.dependencies import SessionLocal
from app.src.auth.enums import UserRoleEnum
from app.src.auth.repository import (
    create_user,
    get_next_wallet_index,
    get_user_by_username,
)
from app.src.auth.security import hash_password
from app.src.blockchain.config import get_blockchain_settings
from app.src.blockchain.hdWallet import derive_wallet_from_index
from app.src.did.blockchain import register_did_on_chain
from app.src.did.registry import DIDRegistryError
from app.src.did.repository import get_did_doc_by_user_id, update_did_chain_anchor
from app.src.did.schemas import DIDCreate
from app.src.did.service import create_did_service
from app.src.trust.registry import (
    TrustedEntityRegistryError,
    get_trusted_entity_registry,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("seed_admin")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create bootstrap admin with DID and issuer authorization.",
    )
    parser.add_argument("--username", default="admin", help="Admin username")
    parser.add_argument("--password", default="admin123", help="Admin password")
    parser.add_argument(
        "--email",
        default="admin@example.com",
        help="Admin email (optional but recommended)",
    )
    parser.add_argument(
        "--role",
        default=UserRoleEnum.ADMIN.value,
        choices=[role.value for role in UserRoleEnum],
        help="User role to assign",
    )
    parser.add_argument(
        "--skip-chain",
        action="store_true",
        help="Skip Besu DID anchor and TrustedEntityRegistry authorization",
    )
    return parser.parse_args()


def ensure_user(
    db,
    *,
    username: str,
    password: str,
    email: str | None,
    role: UserRoleEnum,
):
    existing = get_user_by_username(db, username)
    if existing:
        logger.info("User '%s' already exists (id=%s, role=%s)", username, existing.id, existing.role)
        return existing

    wallet_index = get_next_wallet_index(db)
    wallet = derive_wallet_from_index(wallet_index)

    user = create_user(
        db=db,
        username=username,
        email=email,
        password_hash=hash_password(password),
        wallet_index=wallet_index,
        eth_address=wallet.address,
        role=role,
    )
    logger.info(
        "Created user '%s' (id=%s, role=%s, eth_address=%s)",
        user.username,
        user.id,
        user.role,
        user.eth_address,
    )
    return user


async def ensure_did(db, user):
    did_record = get_did_doc_by_user_id(db, user.id)
    if did_record:
        logger.info("DID already exists for user %s: %s", user.id, did_record.did)
        return did_record

    await create_did_service(
        did=DIDCreate(user_id=user.id),
        db=db,
        background_tasks=None,
    )
    did_record = get_did_doc_by_user_id(db, user.id)
    if not did_record:
        raise RuntimeError(f"DID creation failed for user_id={user.id}")

    logger.info("Created DID for user %s: %s", user.id, did_record.did)
    return did_record


def ensure_did_on_chain(db, did_record) -> None:
    settings = get_blockchain_settings()
    if not settings.require_did_on_chain:
        logger.info("REQUIRE_DID_ON_CHAIN=false; skipping on-chain DID anchor")
        return

    if did_record.tx_hash:
        logger.info(
            "DID already anchored on-chain: %s (tx=%s)",
            did_record.did,
            did_record.tx_hash,
        )
        return

    if not did_record.document_hash:
        raise RuntimeError(f"document_hash missing for DID {did_record.did}")

    try:
        chain_result = register_did_on_chain(
            identity_address=did_record.ethereum_address,
            document_hash=did_record.document_hash,
            did=did_record.did,
        )
    except DIDRegistryError as exc:
        if "already registered" in str(exc).lower():
            logger.warning("DID already on-chain, skipping register: %s", did_record.did)
            return
        raise

    updated = update_did_chain_anchor(
        db=db,
        did=did_record.did,
        tx_hash=chain_result["tx_hash"],
        block_number=chain_result["block_number"],
    )
    if not updated:
        raise RuntimeError(f"Failed to save chain anchor for DID {did_record.did}")

    logger.info(
        "Anchored DID on-chain: %s (tx=%s, block=%s)",
        did_record.did,
        chain_result["tx_hash"],
        chain_result["block_number"],
    )


def ensure_issuer_authorized(eth_address: str) -> None:
    settings = get_blockchain_settings()
    if not settings.require_trusted_issuer:
        logger.info("REQUIRE_TRUSTED_ISSUER=false; skipping issuer authorization")
        return

    registry = get_trusted_entity_registry()
    if registry.is_authorized_issuer(eth_address):
        logger.info("Issuer already authorized: %s", eth_address)
        return

    result = registry.authorize_issuer(eth_address)
    logger.info(
        "Authorized issuer on TrustedEntityRegistry: %s (tx=%s)",
        result["account"],
        result["tx_hash"],
    )


async def seed_admin(args: argparse.Namespace) -> None:
    role = UserRoleEnum(args.role)
    db = SessionLocal()

    try:
        user = ensure_user(
            db,
            username=args.username,
            password=args.password,
            email=args.email,
            role=role,
        )
        did_record = await ensure_did(db, user)

        if args.skip_chain:
            logger.info("--skip-chain set; Besu steps skipped")
        else:
            ensure_did_on_chain(db, did_record)
            ensure_issuer_authorized(user.eth_address)

        print()
        print("Bootstrap complete")
        print(f"  username:    {user.username}")
        print(f"  password:    {args.password}")
        print(f"  user_id:     {user.id}")
        print(f"  role:        {user.role.value if hasattr(user.role, 'value') else user.role}")
        print(f"  eth_address: {user.eth_address}")
        print(f"  did:         {did_record.did}")
        print()
        print("Login: POST /auth/login then use Swagger at http://localhost:8000/docs")
    finally:
        db.close()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(seed_admin(args))
        return 0
    except (DIDRegistryError, TrustedEntityRegistryError, RuntimeError) as exc:
        logger.error("Seed failed: %s", exc)
        logger.error(
            "If Besu is not running, retry with --skip-chain or start Besu first."
        )
        return 1
    except Exception:
        logger.exception("Unexpected error during seed")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
