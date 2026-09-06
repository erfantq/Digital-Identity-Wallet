# Digital Identity Wallet (FUM Wallet)

A university digital identity platform for **issuing**, **holding**, and **verifying** academic credentials in a privacy-preserving, cryptographically verifiable way.

Built around W3C Verifiable Credentials, `did:ethr` decentralized identifiers, and a private Hyperledger Besu network — so identity claims can be trusted without putting personal data on-chain.

---

## What is this project?

**FUM Wallet** is an end-to-end digital identity system for a university (designed with Ferdowsi University of Mashhad in mind).

In simple terms, it replaces fragile paper/PDF “proof of identity or enrollment” workflows with:

1. A **university-issued digital credential** (for example a student / PID credential)
2. A **holder wallet** where the student or staff member keeps that credential
3. A **public verifier** where another party (faculty office, employer, another service) can check that the credential is authentic, still valid, and issued by a trusted university issuer

The platform covers three sides of the trust triangle:

| Actor | Who | What they do |
|-------|-----|----------------|
| **Issuer** | University admins | Register users, issue and revoke credentials |
| **Holder** | Students / teachers / staff | Own a DID + wallet and present credentials |
| **Verifier** | Relying parties | Validate a credential without calling a private campus database |

---

## What does it do?

- Registers university users with roles (`student`, `teacher`, `admin`, …)
- Creates an Ethereum HD wallet and a `did:ethr` for each user
- Issues signed W3C Verifiable Credentials (optionally with IPFS-attached documents)
- Anchors DID / credential status and trusted issuers on Hyperledger Besu
- Optionally mints a non-transferable certificate NFT (Soulbound Token)
- Lets anyone verify a presented credential cryptographically and against on-chain status

Admins work in `/admin`, holders in `/wallet`, and verification is available publicly at `/verify`.

---

## Why was this built?

Universities still rely heavily on:

- Paper certificates and stamped letters
- PDF files that are easy to forge or alter
- Central databases that every verifier must trust and reach
- Manual back-and-forth between offices to confirm “is this student real / enrolled / graduated?”

Those approaches are slow, hard to audit, and poorly suited to digital services. The goal of this project is to give the university a practical SSI-inspired stack where:

- The **university remains the trusted issuer**
- The **user controls presentation** of their credential
- A **verifier can check authenticity independently**
- Sensitive personal data stays **off-chain** (DB / IPFS), while the chain only stores hashes, status, and trust anchors

It is both a working platform and a reference implementation of university digital identity using modern DID + VC + permissioned blockchain patterns.

---

## Why do we need something like this?

Digital identity wallets matter whenever an organization must prove claims about people **without** forcing every relying party to become a full database client of that organization.

For a university specifically:

| Problem today | What a digital identity wallet enables |
|---------------|----------------------------------------|
| Easy-to-forge PDFs / screenshots | Cryptographic signatures that prove issuer authenticity |
| Verifiers must call/email the university | Offline-capable / independent verification of a presented credential |
| Revocation is slow and unclear | On-chain revocation / status that verifiers can check |
| Identity silos per faculty/system | One portable DID + credentials reusable across services |
| Privacy risk if everything is public | PII off-chain; chain holds only integrity and trust metadata |

In short: we need this so academic identity can be **portable**, **verifiable**, and **privacy-aware** — not just another login screen in front of a campus database.

---

## Features

- Role-based portals: **wallet**, **admin**, and public **verifier**
- HD Ethereum wallets derived per user (BIP-39/44)
- Automatic `did:ethr` creation and on-chain anchoring
- W3C Verifiable Credentials with EIP-191 signatures
- Trusted issuer registry, credential registry, and soulbound certificate NFTs (SBT)
- IPFS (Pinata) for attachments and NFT metadata
- Event-driven on-chain writes via RabbitMQ

---

## Architecture

```text
Frontend (React)  →  FastAPI Backend  →  PostgreSQL
                              │
                              ├─ RabbitMQ (async chain jobs)
                              ├─ Hyperledger Besu (registries + SBT)
                              └─ Pinata / IPFS
```

**On-chain principle:** only hashes, status flags, DID controllers, and trusted issuers — no PII.

---

## Tech Stack

| Layer | Stack |
|-------|--------|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic, JWT |
| Frontend | React 19, Vite, React Router |
| Data / messaging | PostgreSQL 16, RabbitMQ |
| Blockchain | Hyperledger Besu, Solidity, Web3.py, Hardhat |
| Storage | Pinata (IPFS) |

---

## Setup & Requirements

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| Docker Desktop + Docker Compose | Backend, Postgres, RabbitMQ |
| Node.js 20+ and npm | Frontend + Hardhat contract deploy |
| Python 3.12 | Only if running the backend without Docker |
| Hyperledger Besu | Private chain for DID / credential registries and SBT |
| Pinata account (optional) | IPFS uploads for attachments and NFT metadata |

Recommended local Besu setup: [Hyperledger Besu Developer Quickstart](https://github.com/hyperledger/besu-docs) (RPC on `http://127.0.0.1:8545`, `chainId` `1337`).

### 1. Configure environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

| Variable | Purpose |
|----------|---------|
| `MASTER_WALLET_MNEMONIC` | BIP-39 mnemonic for deriving user wallets |
| `SECRET_KEY` / `JWT_SECRET_KEY` | Auth secrets (change from placeholders) |
| `BESU_RPC_URL` | Besu JSON-RPC. From Docker backend use `http://host.docker.internal:8545`; without Docker use `http://127.0.0.1:8545` |
| `BESU_CHAIN_ID` | Usually `1337` for Quickstart |
| `BESU_TRUST_ADMIN_PRIVATE_KEY` | Must match the contract **admin** / deployer key (Quickstart demo key is fine for local-only) |
| `PINATA_API_KEY` / `PINATA_SECRET_API_KEY` | Optional; needed for IPFS pinning |

Leave the `*_REGISTRY_ADDRESS` / `CERTIFICATE_SBT_ADDRESS` values blank or outdated until you finish step 3 — addresses from `.env.example` are from a previous network and will not work on a fresh Besu.

### 2. Start Hyperledger Besu

Start your Besu network and confirm RPC responds:

```powershell
curl http://127.0.0.1:8545
```

The backend container reaches the host Besu via `host.docker.internal:8545` (see `BESU_RPC_URL` in `.env`).

### 3. Deploy smart contracts

On a new machine (or a fresh Besu chain), redeploy all four contracts with Hardhat, then copy the new addresses into `.env`.

```powershell
cd blockchain
npm install
npm run compile

# Optional overrides (defaults: RPC 127.0.0.1:8545, chainId 1337, Quickstart deployer key)
# $env:BESU_RPC_URL="http://127.0.0.1:8545"
# $env:BESU_CHAIN_ID="1337"
# $env:BESU_DEPLOYER_KEY="0x..."

npm run deploy:besu              # TrustedEntityRegistry
npm run deploy:did:besu          # DIDRegistry
npm run deploy:credential:besu   # CredentialRegistry
npm run deploy:sbt:besu          # CertificateSBT
cd ..
```

Each script prints the contract address and writes:

- `blockchain/deployments/TrustedEntityRegistry-1337.json`
- `blockchain/deployments/DIDRegistry-1337.json`
- `blockchain/deployments/CredentialRegistry-1337.json`
- `blockchain/deployments/CertificateSBT-1337.json`

Put those addresses into `.env`:

```env
TRUSTED_ENTITY_REGISTRY_ADDRESS=0x...
DID_REGISTRY_ADDRESS=0x...
CREDENTIAL_REGISTRY_ADDRESS=0x...
CERTIFICATE_SBT_ADDRESS=0x...
```

`BESU_TRUST_ADMIN_PRIVATE_KEY` must be the same account that was set as registry admin at deploy time (by default the Hardhat deployer). If they differ, on-chain admin transactions will fail.

### 4. Backend (Docker)

```powershell
docker compose up --build
docker compose exec backend alembic upgrade head
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| RabbitMQ UI | http://localhost:15672 (`guest` / `guest`) |

Optional admin bootstrap:

```powershell
docker compose exec backend python scripts/seed_admin.py
```

With `REQUIRE_TRUSTED_ISSUER=true`, authorize issuer addresses via the admin trust API after bootstrap (Swagger: trusted-issuer endpoints).

More Docker detail: [DOCKER.md](./DOCKER.md)

### 5. Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API (default `http://localhost:8000`) |
| `VITE_IPFS_GATEWAY_URL` | Gateway for `ipfs://` links |
| `VITE_CHAINLENS_URL` | Optional Besu explorer UI |

App: http://localhost:5173

### 6. Backend without Docker (alternative)

Requires local Postgres and RabbitMQ matching your `.env`, plus a reachable Besu.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Use a host DATABASE_URL / RABBITMQ_URL (not the Docker service hostnames)
alembic upgrade head
uvicorn app.src.main:app --reload
```

### First-run checklist

1. Besu RPC is up
2. All four contracts deployed; addresses written to `.env`
3. `BESU_TRUST_ADMIN_PRIVATE_KEY` matches the deploy admin
4. `docker compose up --build` + migrations
5. Frontend `.env` points at the API
6. Seed admin (optional) and authorize trusted issuers before issuing credentials

---

## Project Structure

```text
├── app/src/           # FastAPI domain modules (auth, did, credential, trust)
├── alembic/           # Database migrations
├── blockchain/        # Hardhat project (Solidity registries + CertificateSBT)
├── frontend/          # React SPA
├── docs/              # Architecture & API docs
├── scripts/           # Seed / ops helpers
├── docker-compose.yml
└── DOCKER.md
```

---

## Roles

| Role | Portal |
|------|--------|
| `user` / `student` / `teacher` | `/wallet` |
| `admin` | `/admin` |
| `super_admin` | `/admin` (+ admin & issuer management) |
| Public | `/`, `/login`, `/verify` |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/overview.md](./docs/overview.md) | Product overview |
| [docs/architecture-and-implementation.md](./docs/architecture-and-implementation.md) | Architecture & implementation |
| [docs/did-and-credential-fields.md](./docs/did-and-credential-fields.md) | DID, DID Document & credential field glossary |
| [docs/api-reference.md](./docs/api-reference.md) | REST API reference |
| [DOCKER.md](./DOCKER.md) | Docker operations |
| [frontend/README.md](./frontend/README.md) | Frontend notes |

---

## Security

- Do not commit real `.env` files, mnemonics, or private keys
- `MASTER_WALLET_MNEMONIC` and `BESU_TRUST_ADMIN_PRIVATE_KEY` are critical secrets
- Use `.env.example` as the template only

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
