# Project Overview — Digital Identity Wallet (FUM Wallet)

A university digital identity platform for managing student and staff identity, issuing and verifying W3C Verifiable Credentials (VCs), and anchoring them to decentralized identifiers (`DID`) and a private blockchain.

---

## Purpose

The system lets a university:

- Register users (students, teachers, admins) with explicit roles
- Create a `DID` for each user
- Issue signed digital credentials (for example a university PID credential)
- Anchor credentials on-chain (Hyperledger Besu)
- Optionally mint a non-transferable NFT (Soulbound Token / SBT) for each certificate
- Allow third parties (Relying Parties) to verify credentials without blindly trusting a central server

---

## Main Components

| Layer | Role |
|-------|------|
| **Frontend** (`frontend/`) | React UI for wallet, admin portal, and public verifier |
| **Backend** (`app/src/`) | FastAPI REST API for auth, DID, credentials, and trust |
| **PostgreSQL** | Stores users, DIDs, and credentials (cache / metadata) |
| **RabbitMQ** | Asynchronous event bus for on-chain write operations |
| **Hyperledger Besu** | Private chain for DID, credential, trust, and SBT registries |
| **IPFS (Pinata)** | Stores attachments and NFT metadata |

---

## User Roles

| Role | Access |
|------|--------|
| `user` / `student` / `teacher` | Wallet portal (`/wallet`) — view own DID and credentials |
| `admin` | Admin portal (`/admin`) — register users, issue/revoke credentials, manage DIDs |
| `super_admin` | All admin capabilities + manage admins and on-chain issuer authorization |
| Public (no login) | Landing page, login, and credential verification (`/verify`) |

---

## High-Level Flow

```text
Admin registers a user
    → Derive HD wallet + save user in DB
    → Publish user.created
    → Create DID + save in DB
    → Publish did.created
    → Anchor DID on DIDRegistry

Admin issues a credential
    → Check issuer trust on TrustedEntityRegistry
    → Sign VC + upload attachment to IPFS
    → Save credential in DB + publish cred.created
    → Register on CredentialRegistry + mint CertificateSBT

Anyone verifies a credential
    → Check signature, issuer trust, DID status, credential registry, and SBT
    → Return valid / invalid with detailed check results
```

---

## Design Principle

**No personal data (PII) is stored on-chain.** The chain only holds hashes, active/revoked status, DID controllers, and the trusted issuer list. Full credential content and files remain off-chain (database / IPFS).

---

## Local Development URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Frontend | usually http://localhost:5173 |
| PostgreSQL | localhost:5432 |
| RabbitMQ Management | http://localhost:15672 |
| Besu RPC | usually http://localhost:8545 |
| Chainlens Explorer | usually http://localhost:8082 |

See `DOCKER.md` for Docker setup details.

---

## Related Docs

| Document | Contents |
|----------|----------|
| [architecture-and-implementation.md](./architecture-and-implementation.md) | Architecture, tech stack, and how each part works |
| [api-reference.md](./api-reference.md) | Full API reference |
| [on-chain-implementation-roadmap.md](./on-chain-implementation-roadmap.md) | On-chain implementation roadmap |
| [../DOCKER.md](../DOCKER.md) | Docker guide |
| [../frontend/README.md](../frontend/README.md) | Frontend notes |
