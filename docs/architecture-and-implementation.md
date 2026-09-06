# Architecture & Implementation

How the Digital Identity Wallet is built: tech stack, module design, and runtime flows.

---

## 1. Technology Stack

### Backend

| Category | Technology |
|----------|------------|
| Language | Python 3.12 |
| Framework | FastAPI |
| ORM / DB | SQLAlchemy 2.x, PostgreSQL 16, Alembic |
| Auth | JWT (`python-jose`), bcrypt (`passlib`) |
| Messaging | RabbitMQ via `aio-pika` (exchange `dididentity`, topic routing) |
| Blockchain | Web3.py, eth-account, Hardhat contracts |
| Wallet derivation | `bip-utils` (BIP-39/44, path `m/44'/60'/0'/0/{wallet_index}`) |
| IPFS | Pinata REST API (`httpx`) |
| Observability | Prometheus (`prometheus-fastapi-instrumentator`), OpenTelemetry (DID module) |
| Validation | Pydantic v2 |

Entry point: `app/src/main.py` — mounts routers, connects RabbitMQ consumers, exposes metrics, and configures CORS.

### Frontend

| Category | Technology |
|----------|------------|
| Language | JavaScript (JSX) |
| Build | Vite + React 19 |
| Routing | React Router 7 |
| Styling | Plain CSS + design tokens |
| HTTP | Native `fetch` wrapper (`frontend/src/api/`) |
| Auth storage | JWT in `localStorage` |

### Blockchain & Storage

| Item | Detail |
|------|--------|
| Chain | Hyperledger Besu (local chain ID `1337`) |
| Contracts | Solidity ^0.8.27 (`blockchain/contracts/`) |
| Explorer | Chainlens / Epirus |
| Off-chain files | Pinata → IPFS (`ipfs://…`) |

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `TrustedEntityRegistry` | Authorized issuer allowlist |
| `DIDRegistry` | DID document hash + controller anchor |
| `CredentialRegistry` | Credential issuance / revocation anchor |
| `CertificateSBT` | Non-transferable certificate NFT |

---

## 2. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite / React)                                    │
│  Landing · Login · Wallet · Admin · Verifier                │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + JWT
┌──────────────────────────▼──────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  /auth  /dids  /credentials  /trusted-entities              │
│  EventBus (RabbitMQ) → async on-chain consumers             │
└───────┬──────────────────┬──────────────────┬───────────────┘
        │                  │                  │
   PostgreSQL          Besu RPC            Pinata/IPFS
   (users, DIDs,       (registries +       (attachments,
    credentials)        CertificateSBT)     NFT metadata)
```

### Write path pattern (event-driven)

Most on-chain writes follow this pattern:

1. API validates input and writes to PostgreSQL
2. API publishes a RabbitMQ event
3. A consumer performs the blockchain transaction
4. Consumer updates DB with `tx_hash`, block number, SBT ids, etc.

This keeps HTTP responses fast and isolates chain latency / failures from the request path.

**Subscribed events** (wired in `main.py` lifespan):

| Event | Handler | Effect |
|-------|---------|--------|
| `user.created` | `handle_user_created` | Create DID for new user |
| `did.created` | `handle_did_created` | Anchor DID on `DIDRegistry` |
| `cred.created` | `handle_cred_created` | Register credential + mint SBT |
| `cred.revoked` | `handle_cred_revoked` | Revoke on credential registry + SBT |

---

## 3. Backend Modules

Base path: `app/src/`

### `auth/` — Users, roles, JWT

- Registers users (admin/super_admin only)
- Derives an Ethereum wallet from `MASTER_WALLET_MNEMONIC` + `wallet_index`
- Issues JWT claims: `user_id`, `role`, `wallet_index`, `eth_address`
- Admin directory, dashboard stats, and super-admin admin management

Key files: `router.py`, `service.py`, `repository.py`, `security.py`, `models.py`, `enums.py`

Roles (`UserRoleEnum`): `user`, `admin`, `super_admin`, `student`, `teacher`

### `did/` — Decentralized identifiers

- Creates and resolves `did:ethr:{user_id}:{ethereum_address}` documents
- Caches DID documents in PostgreSQL
- Anchors document hash on `DIDRegistry` via events
- Supports on-chain status lookup and deactivation

Key files: `router.py`, `service.py`, `events.py`, `registry.py`, `repository.py`, `schemas.py`

### `credential/` — Verifiable Credentials, IPFS, SBT

- Issues W3C VCs signed with EIP-191 (`EthereumEip191Signature2026`)
- Optionally uploads attachments to IPFS and pins ERC-721 metadata
- Stores credential JSON + chain/SBT metadata in DB
- Public multi-step verification for Relying Parties
- Revokes credentials in DB and asynchronously on-chain

Key files: `router.py`, `cryptography.py`, `verification.py`, `events.py`, `registry.py`, `sbt.py`, `ipfsService.py`, `nft_metadata.py`

### `trust/` — Trusted issuer registry

- Checks / authorizes / revokes issuer addresses on `TrustedEntityRegistry`
- Authorize and revoke require `super_admin`
- Issue and verify flows consult this registry when feature flags are enabled

### `blockchain/` — Shared chain utilities

- `config.py` — RPC, chain ID, contract addresses, feature flags
- `hdWallet.py` — BIP-39/44 wallet derivation
- `abis/` — Contract ABIs used by Web3 services

### `common/` — Shared infrastructure

- `database.py` — SQLAlchemy session factory
- `messaging.py` — RabbitMQ `EventBus`
- `auth_dependencies.py` — `get_current_user_from_token`, `require_admin`, `require_super_admin`
- `response.py` — `{ status, message, data }` envelope
- `pagination.py`, `exceptions.py`

---

## 4. Frontend Structure

Base path: `frontend/src/`

```text
api/           HTTP clients (auth, dids, credentials, trust)
components/    Admin panels, landing, verifier, shared UI
context/       AuthContext (JWT session)
features/      Layouts + nav for admin / wallet / verifier
hooks/         useAuth, useAsyncAction
pages/         Route-level pages
routes/        React Router config
styles/        Per-page CSS + tokens
utils/         roles, jwt, chainStatus, credential/did formatters
```

### Role → portal mapping

| Roles | Portal | Default route |
|-------|--------|---------------|
| `user`, `student`, `teacher` | Wallet | `/wallet` |
| `admin`, `super_admin` | Admin | `/admin` |
| Public | Verifier | `/verify` |

Important UX note: API success does **not** mean on-chain finality. The UI uses `StatusBadge` and `chainStatus.js` to show pending / confirmed / missing chain anchors.

---

## 5. End-to-End Flows

### 5.1 Login

1. `POST /auth/login` with username/password (OAuth2 form)
2. Backend verifies bcrypt hash and returns a JWT
3. Frontend stores the token and redirects by role (`/admin` or `/wallet`)

### 5.2 User registration → DID creation

1. Admin calls `POST /auth/register`
2. Backend derives wallet for the next `wallet_index`, stores the user, publishes `user.created`
3. Consumer creates the DID document and publishes `did.created`
4. Consumer anchors the DID on `DIDRegistry` and stores `tx_hash` / block number

Bootstrap alternative: `scripts/seed_admin.py` can create a `super_admin`, DID, chain anchor, and issuer authorization (optionally with `--skip-chain`).

### 5.3 Credential issuance

1. Admin submits `POST /credentials/issue` (multipart: JSON + optional file)
2. Backend checks holder DID exists and issuer is authorized (if `REQUIRE_TRUSTED_ISSUER`)
3. Attachment is pinned to IPFS; VC JSON is built and signed with the admin’s derived private key
4. Credential hash is computed; optional NFT metadata is pinned
5. Record is saved; `cred.created` is published
6. Consumer registers the credential and mints `CertificateSBT` to the holder address

### 5.4 Credential verification

`POST /credentials/verify` runs a Relying Party checklist (feature flags control on-chain depth), typically including:

1. EIP-191 signature validity
2. Issuer DID active
3. Issuer authorized in trust registry
4. Credential registered on-chain
5. Hash match
6. Not revoked
7. Holder DID consistency
8. SBT minted, owned by holder, not revoked

Response shape: `{ valid, checks, errors, details }` inside the standard success envelope.

### 5.5 Revocation

1. Admin calls `POST /credentials/revoke`
2. DB status becomes `revoked`
3. `cred.revoked` consumer revokes on `CredentialRegistry` and `CertificateSBT`

### 5.6 Trust management

- `super_admin` authorizes issuer addresses via `POST /trusted-entities/authorize`
- Anyone can query authorization status
- Issue/verify enforce trust when the related env flags are enabled

---

## 6. Data Model (conceptual)

| Table | Main fields |
|-------|-------------|
| `users` | username, email, password_hash, role, wallet_index, eth_address |
| `dids` | did, ethereum_address, document, document_hash, tx_hash, active |
| `credentials` | credential_id, issuer, holder_did, credential JSON, status, hashes, tx / SBT metadata |

Field-by-field meanings for DID strings, DID Documents, VC JSON, and DB columns: [did-and-credential-fields.md](./did-and-credential-fields.md).

Migrations live under `alembic/versions/`.

---

## 7. Infrastructure & Configuration

### Docker Compose services

| Service | Port | Notes |
|---------|------|-------|
| `backend` | 8000 | Built from repo `Dockerfile`, hot-reload mount |
| `postgres` | 5432 | DB `did_wallet` |
| `rabbitmq` | 5672 / 15672 | Management UI |

Besu, Chainlens, and the frontend Vite server typically run outside Compose. Backend reaches Besu through `host.docker.internal`.

### Important environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
| `MASTER_WALLET_MNEMONIC` | HD seed for all user wallets (**critical secret**) |
| `RABBITMQ_*` | Event bus connection |
| `BESU_RPC_URL`, `BESU_CHAIN_ID` | Chain RPC |
| `*_REGISTRY_ADDRESS`, `CERTIFICATE_SBT_ADDRESS` | Deployed contract addresses |
| `BESU_TRUST_ADMIN_PRIVATE_KEY` | Signer for registry / SBT admin txs |
| `PINATA_*`, `IPFS_GATEWAY_URL` | IPFS pinning + gateway |
| `REQUIRE_TRUSTED_ISSUER` | Enforce issuer allowlist on issue |
| `REQUIRE_DID_ON_CHAIN` / `REQUIRE_CREDENTIAL_ON_CHAIN` | Enable chain anchoring consumers |
| `CHECK_*_ON_CHAIN_*` | Enforce chain checks on resolve/verify |
| `REQUIRE_CERTIFICATE_SBT` / `CHECK_CERTIFICATE_SBT_VERIFY` | SBT mint + verify checks |

Templates: `.env.example`, `frontend/.env.example`.

---

## 8. Local Development Commands

```powershell
# Backend (venv)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.src.main:app --reload

# Docker stack
copy .env.example .env
docker compose up --build
docker compose exec backend alembic upgrade head

# Frontend
cd frontend
npm install
npm run dev
```

Interactive API docs: http://localhost:8000/docs

---

## 9. Security Notes

- Never commit real `.env` secrets, mnemonics, or private keys
- On-chain data is intentional limited to hashes and status flags
- Admin issuance keys are derived from the shared master mnemonic — protect that seed carefully
- JWT claims include wallet material needed for signing; treat tokens as sensitive
- Treat Alembic migrations and auth/role changes as high-review areas
