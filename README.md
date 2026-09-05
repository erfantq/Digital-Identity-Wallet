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

## Quick Start

### 1. Backend (Docker)

```powershell
Copy-Item .env.example .env
docker compose up --build
docker compose exec backend alembic upgrade head
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| RabbitMQ UI | http://localhost:15672 (`guest` / `guest`) |

Besu should be reachable from the backend (default `BESU_RPC_URL`, often via `host.docker.internal:8545`). Deploy contracts and set registry addresses in `.env`.

Optional bootstrap:

```powershell
docker compose exec backend python scripts/seed_admin.py
```

### 2. Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

### 3. Backend without Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.src.main:app --reload
```

More detail: [DOCKER.md](./DOCKER.md)

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
