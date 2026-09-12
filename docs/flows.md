# System Flows — Digital Identity Wallet

Mermaid diagrams for every major user/admin action and the side effects that follow (API → database → RabbitMQ → blockchain / IPFS).

Related docs: [overview.md](./overview.md) · [architecture-and-implementation.md](./architecture-and-implementation.md) · [did-and-credential-fields.md](./did-and-credential-fields.md)

---

## Legend

| Symbol / color idea | Meaning |
|---------------------|---------|
| **Actor** | Human or portal (Admin, Holder, Verifier, Super Admin) |
| **API** | FastAPI endpoint |
| **DB** | PostgreSQL write/read |
| **Bus** | RabbitMQ event publish/consume |
| **Chain** | Hyperledger Besu contract call |
| **IPFS** | Pinata pin |

Feature flags (`.env`) can skip some chain steps: `REQUIRE_DID_ON_CHAIN`, `REQUIRE_CREDENTIAL_ON_CHAIN`, `REQUIRE_CERTIFICATE_SBT`, `REQUIRE_TRUSTED_ISSUER`, `CHECK_*_VERIFY`.

---

## 0. High-level architecture

```mermaid
flowchart TB
  subgraph Frontend
    Landing["/"]
    Login["/login"]
    Wallet["/wallet/*"]
    Admin["/admin/*"]
    Verify["/verify"]
  end

  subgraph Backend["FastAPI"]
    Auth["/auth"]
    DIDs["/dids"]
    Creds["/credentials"]
    Trust["/trusted-entities"]
    Bus["EventBus aio-pika"]
  end

  PG[(PostgreSQL)]
  RMQ[[RabbitMQ]]
  Besu[(Hyperledger Besu)]
  IPFS[(Pinata / IPFS)]

  Landing --> Login
  Login --> Auth
  Wallet --> Auth
  Wallet --> DIDs
  Wallet --> Creds
  Admin --> Auth
  Admin --> DIDs
  Admin --> Creds
  Admin --> Trust
  Verify --> Creds

  Auth --> PG
  DIDs --> PG
  Creds --> PG
  Auth --> Bus
  DIDs --> Bus
  Creds --> Bus
  Bus --> RMQ
  RMQ --> Bus
  Bus --> Besu
  Creds --> IPFS
  Trust --> Besu
  DIDs --> Besu
  Creds --> Besu
```

---

## 1. Frontend routing by role

```mermaid
flowchart TD
  Start([User opens app]) --> Landing[Landing /]
  Landing --> LoginPage[Login /login]
  LoginPage --> AuthAPI["POST /auth/login"]
  AuthAPI --> JWT[Store JWT in localStorage]
  JWT --> Role{role in JWT}

  Role -->|user / student / teacher| Wallet["/wallet"]
  Role -->|admin / super_admin| Admin["/admin"]

  Wallet --> WHome[Overview]
  Wallet --> WCreds[My credentials]
  Wallet --> WDID[My DID]
  Wallet --> WResolve[Resolve DID]
  Wallet --> WVerify[Embedded verify]

  Admin --> AHome[Dashboard]
  Admin --> AUsers[Register user]
  Admin --> ADir[User directory]
  Admin --> ADIDs[DID management]
  Admin --> AIssue[Issue credential]
  Admin --> ACreds[User credentials + revoke]
  Admin --> AVerify[Embedded verify]
  Admin --> AAdmins[Admin management<br/>super_admin]

  Public([No login]) --> PubVerify["/verify"]
```

---

## 2. Login

**Action:** User submits username/password on `/login`.

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend
  participant API as POST /auth/login
  participant DB as PostgreSQL

  U->>FE: Enter credentials
  FE->>API: OAuth2 form (username, password)
  API->>DB: Load user by username
  alt User missing or bad password
    API-->>FE: 401 Unauthorized
  else OK
    API->>API: Verify bcrypt hash
    API->>API: Build JWT<br/>(sub, user_id, role, wallet_index, eth_address)
    API-->>FE: access_token
    FE->>FE: localStorage.setItem(token)
    FE->>FE: Redirect by role → /wallet or /admin
  end
```

**Side effects:** None on chain. No RabbitMQ event.

---

## 3. Register user → auto DID → on-chain DID

**Action:** Admin registers a user (`POST /auth/register`).

```mermaid
sequenceDiagram
  actor A as Admin
  participant API as POST /auth/register
  participant DB as PostgreSQL
  participant Bus as RabbitMQ
  participant C1 as handle_user_created
  participant DID as create_did_service
  participant C2 as handle_did_created
  participant Chain as DIDRegistry

  A->>API: username, email, password, role
  API->>API: Next wallet_index
  API->>API: Derive HD wallet<br/>m/44'/60'/0'/0/{index}
  API->>DB: INSERT users<br/>(password_hash, eth_address, …)
  API->>Bus: publish user.created
  API-->>A: User created (HTTP 200)

  Bus->>C1: user.created {user_id, …}
  C1->>DID: Create did:ethr:{user_id}:{address}
  DID->>DB: INSERT dids<br/>(document, document_hash, active)
  DID->>Bus: publish did.created

  Bus->>C2: did.created {did, ethereum_address, document_hash}
  alt REQUIRE_DID_ON_CHAIN=true
    C2->>Chain: registerDid(controller, documentHash)
    C2->>DB: UPDATE dids SET tx_hash, block_number
  else flag false
    C2-->>C2: Skip chain
  end
```

```mermaid
flowchart LR
  subgraph Sync["HTTP request path"]
    R[Register] --> U[(users)]
    R --> E1[user.created]
  end
  subgraph Async["Consumers"]
    E1 --> D[Create DID]
    D --> DBdid[(dids)]
    D --> E2[did.created]
    E2 --> Anchor[DIDRegistry]
    Anchor --> DBdid
  end
```

**If chain fails / delayed:** User + DID exist in DB; `tx_hash` null → UI shows DID **pending / not anchored**. Login still works.

---

## 4. Event bus map (all domain events)

```mermaid
flowchart TB
  subgraph Publishers
    AuthReg["auth/register"]
    DidSvc["did/service create"]
    CredIssue["credentials/issue"]
    CredRevoke["credentials/revoke"]
  end

  subgraph Exchange["RabbitMQ topic: dididentity"]
    EC1[user.created]
    EC2[did.created]
    EC3[cred.created]
    EC4[cred.revoked]
  end

  subgraph Consumers["main.py lifespan subscribers"]
    H1[handle_user_created]
    H2[handle_did_created]
    H3[handle_cred_created]
    H4[handle_cred_revoked]
  end

  AuthReg --> EC1 --> H1
  DidSvc --> EC2 --> H2
  CredIssue --> EC3 --> H3
  CredRevoke --> EC4 --> H4

  H1 --> CreateDID[Create DID in DB]
  CreateDID --> EC2
  H2 --> DIDReg[DIDRegistry.registerDid]
  H3 --> CredReg[CredentialRegistry.registerCredential]
  H3 --> SBT[CertificateSBT.mintCertificate]
  H4 --> CredRev[CredentialRegistry.revokeCredential]
  H4 --> SBTRev[CertificateSBT.revokeCertificate]
```

---

## 5. Issue credential (+ IPFS + registry + SBT)

**Action:** Admin issues a VC (`POST /credentials/issue`, multipart JSON + optional file).

```mermaid
sequenceDiagram
  actor A as Admin / Issuer
  participant API as POST /credentials/issue
  participant Trust as TrustedEntityRegistry
  participant DB as PostgreSQL
  participant IPFS as Pinata
  participant Bus as RabbitMQ
  participant C as handle_cred_created
  participant Reg as CredentialRegistry
  participant SBT as CertificateSBT

  A->>API: cred_json + optional attachment
  API->>DB: Resolve holder DID / user
  alt Holder DID missing
    API-->>A: 404 / 400
  end

  opt REQUIRE_TRUSTED_ISSUER
    API->>Trust: isAuthorizedIssuer(issuer eth address)
    alt Not authorized
      API-->>A: 403
    end
  end

  opt Attachment present
    API->>IPFS: Pin file → ipfs://…
  end

  API->>API: Build VC<br/>id=urn:uuid:…<br/>issuer=admin DID<br/>credentialSubject.id=holder_did
  API->>API: Sign EIP-191<br/>proof type EthereumEip191Signature2026
  API->>API: credential_hash = keccak(canonical VC)

  opt REQUIRE_CERTIFICATE_SBT
    API->>IPFS: Pin NFT metadata JSON<br/>(includes VC / hashes / holderDid)
  end

  API->>DB: INSERT credentials<br/>(credential JSON, hash, status=active,<br/>sbt_token_uri if pinned)
  API->>Bus: publish cred.created
  API-->>A: Issued credential (+ pending chain fields)

  Bus->>C: cred.created payload
  opt REQUIRE_CREDENTIAL_ON_CHAIN
    C->>Reg: registerCredential<br/>(idHash, credHash, issuer, holderDidHash)
    C->>DB: UPDATE tx_hash, block_number
  end
  opt REQUIRE_CERTIFICATE_SBT
    C->>SBT: mintCertificate<br/>(to=holder address, idHash, credHash, issuer, tokenURI)
    C->>DB: UPDATE sbt_token_id, sbt_tx_hash, sbt_token_uri
  end
```

```mermaid
flowchart TB
  Issue[Issue API] --> VC[Signed VC in DB]
  VC --> E[cred.created]
  E --> R[CredentialRegistry<br/>key = keccak credential_id]
  E --> N[CertificateSBT<br/>key = keccak credential_id<br/>owner = holder eth address]
  VC -.holder_did.-> DID[(dids)]
  N -.tokenURI.-> Meta[IPFS metadata]
```

**UI after issue:** Credential visible to holder; Registry/SBT pills may show **pending** until consumers finish.

---

## 6. Verify credential (Relying Party)

**Action:** Anyone posts VC JSON to `POST /credentials/verify` (public `/verify` or embedded).

```mermaid
flowchart TD
  In[VC JSON] --> C1{1. EIP-191 signature valid?}
  C1 -->|fail| Invalid
  C1 -->|ok| C2{2. Issuer DID active?<br/>CHECK_DID_ON_CHAIN}
  C2 -->|fail| Invalid
  C2 -->|ok / skipped| C3{3. Issuer trusted?<br/>TrustedEntityRegistry}
  C3 -->|fail| Invalid
  C3 -->|ok / skipped| C4{4. Registered on<br/>CredentialRegistry?}
  C4 -->|fail| Invalid["valid: false + errors[]"]
  C4 -->|ok| C5{5. Local keccak hash<br/>== on-chain credentialHash?}
  C5 -->|fail| Invalid
  C5 -->|ok| C6{6. Not revoked on registry?}
  C6 -->|fail| Invalid
  C6 -->|ok| C7{7. holderDidHash matches<br/>credentialSubject.id?}
  C7 -->|fail| Invalid
  C7 -->|ok| C8{8. SBT minted?<br/>CHECK_CERTIFICATE_SBT_VERIFY}
  C8 -->|fail| Invalid
  C8 -->|ok / skipped| C9{9. SBT owner == holder address?}
  C9 -->|fail| Invalid
  C9 -->|ok| C10{10. SBT not revoked?}
  C10 -->|fail| Invalid
  C10 -->|ok| Valid["valid: true<br/>checks + details"]
```

```mermaid
sequenceDiagram
  actor V as Verifier
  participant FE as /verify UI
  participant API as POST /credentials/verify
  participant DB as PostgreSQL
  participant DIDR as DIDRegistry
  participant Trust as TrustedEntityRegistry
  participant CredR as CredentialRegistry
  participant SBT as CertificateSBT

  V->>FE: Paste / upload VC JSON
  FE->>API: credential body
  API->>API: recover_signer_address (EIP-191)
  API->>DIDR: issuer DID active (optional flag)
  API->>Trust: isAuthorizedIssuer (optional flag)
  API->>CredR: getCredentialRecord(keccak(id))
  API->>API: Compare hashes + holderDidHash
  API->>SBT: getCertificate(keccak(id))
  API->>API: owner / revoked checks
  API-->>FE: { valid, checks, errors, details }
  FE-->>V: Checklist UI
```

**Note:** `GET /credentials/{id}` only reads DB — it does **not** run this checklist. Trust comes from Verify (and optional on-chain status endpoints).

---

## 7. Revoke credential

**Action:** Admin revokes (`POST /credentials/revoke`).

```mermaid
sequenceDiagram
  actor A as Admin
  participant API as POST /credentials/revoke
  participant DB as PostgreSQL
  participant Bus as RabbitMQ
  participant C as handle_cred_revoked
  participant Reg as CredentialRegistry
  participant SBT as CertificateSBT

  A->>API: credential_id + optional reason
  API->>DB: Load credential
  alt Already revoked
    API-->>A: 409 Conflict
  else Active
    API->>DB: status=revoked, revoked_at, revoked_by, reason
    API->>Bus: publish cred.revoked
    API-->>A: Revoked locally (chain pending)
  end

  Bus->>C: cred.revoked
  opt REQUIRE_CREDENTIAL_ON_CHAIN
    C->>Reg: revokeCredential(idHash, reasonCode)
    C->>DB: UPDATE revoke_tx_hash
  end
  opt SBT enabled
    C->>SBT: revokeCertificate(idHash)
    C->>DB: UPDATE sbt_revoke_tx_hash
  end
```

**After revoke:** Holder still sees the record as revoked; Verify fails on `not_revoked` / `sbt_not_revoked`.

---

## 8. DID resolve (public / me)

**Action:** `GET /dids/{did}` or `GET /dids/me`.

```mermaid
sequenceDiagram
  actor U as Anyone / Holder
  participant API as GET /dids/{did} or /me
  participant DB as PostgreSQL
  participant Chain as DIDRegistry

  U->>API: did string (or JWT for /me)
  API->>DB: Load dids row + document
  alt Not found
    API-->>U: 404
  else Found
    opt CHECK_DID_ON_CHAIN_RESOLVE
      API->>Chain: getDidRecord / isActive
      API->>API: Compare document_hash;<br/>set deactivated metadata
    end
    API-->>U: DID Resolution<br/>(document + metadata)
  end
```

---

## 9. Deactivate DID (admin)

**Action:** `POST /dids/on-chain/deactivate` (admin).

```mermaid
sequenceDiagram
  actor A as Admin
  participant API as POST /dids/on-chain/deactivate
  participant Chain as DIDRegistry
  participant DB as PostgreSQL

  A->>API: { did }
  API->>Chain: deactivateDid(didHash)
  API->>DB: active = false
  API-->>A: tx_hash + success
```

**Effect on Verify:** Issuer (or relevant) DID active check can fail → credentials from that issuer may no longer verify when DID checks are enabled.

---

## 10. Trust management (super_admin)

**Actions:** Authorize / revoke issuer; public status query.

```mermaid
sequenceDiagram
  actor SA as Super Admin
  participant AuthZ as POST /trusted-entities/authorize
  participant Rev as POST /trusted-entities/revoke
  participant Q as GET /trusted-entities/{account}/is-authorized-issuer
  participant Chain as TrustedEntityRegistry

  SA->>AuthZ: account address
  AuthZ->>Chain: authorizeIssuer(account)
  AuthZ-->>SA: success

  SA->>Rev: account address
  Rev->>Chain: revokeIssuer(account)
  Rev-->>SA: success

  Note over Q,Chain: Public — no login required
  Q->>Chain: isAuthorizedIssuer(account)
  Q-->>Q: { authorized: bool }
```

```mermaid
flowchart LR
  Issue[Issue credential] -->|REQUIRE_TRUSTED_ISSUER| T{Issuer on allowlist?}
  T -->|no| Block[403]
  T -->|yes| Continue[Sign + save VC]
  Verify[Verify credential] -->|trust check flag| T2{Issuer trusted?}
  T2 -->|no| Fail[valid false]
  T2 -->|yes| Next[Continue checklist]
```

UI: primarily **Admin → Admin Management** (and Swagger). Dedicated `/admin/trust` route is currently commented out.

---

## 11. List / read credentials (no chain mutation)

```mermaid
flowchart TD
  subgraph Holder
    H1["GET /credentials/users/auth/credentials"]
    H1 --> DB1[(credentials WHERE holder_did = my DID)]
  end

  subgraph Admin
    A1["GET /credentials/users/{username}/credentials"]
    A1 --> DB2[(credentials for that user)]
  end

  subgraph Anyone with id
    G1["GET /credentials/{credential_id}"]
    G1 --> DB3[(single row + cached sbt_* / tx_*)]
  end

  subgraph On-chain peek
    O1["GET /credentials/on-chain/status?credential_id="]
    O1 --> Reg[CredentialRegistry]
    O2["GET /credentials/on-chain/sbt?credential_id="]
    O2 --> SBT[CertificateSBT]
  end

  Note1[Wallet/Admin UI may call on-chain peek<br/>to show Registry/SBT pills]
```

---

## 12. Linking model: DID ↔ Credential ↔ SBT

```mermaid
flowchart TB
  User[(users)] -->|wallet_index / eth_address| DID["DID<br/>did:ethr:userId:0x…"]
  DID -->|document_hash| DIDR[DIDRegistry]

  DID -->|holder_did<br/>credentialSubject.id| VC["Credential VC<br/>id = urn:uuid:…"]
  IssuerDID[Issuer DID] -->|issuer field| VC

  VC -->|keccak credential_id| CredR["CredentialRegistry<br/>credentialHash<br/>holderDidHash<br/>issuer address"]
  VC -->|keccak credential_id| SBT["CertificateSBT<br/>credentialHash<br/>owner = holder 0x<br/>tokenURI → IPFS"]

  VC --> DB[(credentials row<br/>sbt_token_id, tx_hash, …)]
```

**Important:** Contracts store **`credentialIdHash`**, not the raw `urn:uuid:…` string. The verifier must possess the full VC (or at least `id`) to recompute the key.

---

## 13. DB present, chain missing (consistency)

```mermaid
stateDiagram-v2
  [*] --> IssuedLocal: API saves credential / DID
  IssuedLocal --> PendingChain: Event published
  PendingChain --> Anchored: Consumer tx success
  PendingChain --> StuckPending: Consumer fail / Besu down

  Anchored --> VerifyOK: Verify checklist passes
  StuckPending --> VerifyFail: issued_on_chain / sbt_minted false

  note right of StuckPending
    Row remains in PostgreSQL.
    UI: Pending / Local only.
    No auto-delete.
  end note
```

| Situation | Wallet / Admin UI | Verify |
|-----------|-------------------|--------|
| In DB, no `tx_hash` | Registry pending | `issued_on_chain: false` → invalid |
| In DB, no `sbt_token_id` | SBT pending | `sbt_minted: false` → invalid (if flag on) |
| Revoked in DB, chain revoke pending | Confirming revoke | May still fail once chain catches up; local status already revoked |

---

## 14. Bootstrap: `scripts/seed_admin.py`

```mermaid
flowchart TD
  Start([python scripts/seed_admin.py]) --> CreateSA[Create / ensure super_admin user]
  CreateSA --> Wallet[Derive HD wallet]
  Wallet --> DID[Create DID sync]
  DID --> ChainOpt{--skip-chain?}
  ChainOpt -->|no| Anchor[Anchor DIDRegistry]
  ChainOpt -->|yes| Skip1[Skip DID chain]
  Anchor --> AuthIssuer[Authorize issuer on<br/>TrustedEntityRegistry]
  Skip1 --> Done([Ready to login / issue])
  AuthIssuer --> Done
```

---

## 15. Admin & wallet read-only dashboards

```mermaid
flowchart LR
  subgraph AdminDashboard["GET /auth/admin/dashboard"]
    S1[User counts]
    S2[DID pending vs anchored]
    S3[Credentials active / revoked]
    S4[Registry / SBT pending counts]
  end

  subgraph WalletHome["Wallet overview"]
    W1[My DID status]
    W2[Recent credentials]
    W3[Local pending vs minted pills]
  end

  DB[(PostgreSQL aggregates)] --> AdminDashboard
  DB --> WalletHome
```

These endpoints **aggregate DB state**; they do not themselves write to Besu.

---

## 16. Auth helpers (who can call what)

```mermaid
flowchart TD
  Req[Request + Bearer JWT] --> Parse[get_current_user_from_token]
  Parse --> Role{Role check}

  Role -->|any authenticated| Me[e.g. GET /dids/me<br/>GET own credentials]
  Role -->|admin or super_admin| AdminOps[register, issue, revoke,<br/>deactivate DID, list users]
  Role -->|super_admin only| SuperOps[list/delete admins<br/>authorize/revoke issuer]
  Role -->|no token| Public[login, landing,<br/>GET /dids/id, POST /verify,<br/>is-authorized-issuer]
```

---

## Quick action → side-effect cheat sheet

| Action | HTTP | DB | Event | Chain / IPFS |
|--------|------|----|-------|--------------|
| Login | `POST /auth/login` | read user | — | — |
| Register user | `POST /auth/register` | insert user | `user.created` → DID → `did.created` | `DIDRegistry` |
| Create DID (manual) | `POST /dids/` | insert did | `did.created` | `DIDRegistry` |
| Resolve DID | `GET /dids/{did}` / `/me` | read | — | optional read registry |
| Deactivate DID | `POST /dids/on-chain/deactivate` | `active=false` | — | `deactivateDid` (sync) |
| Issue credential | `POST /credentials/issue` | insert VC | `cred.created` | IPFS + Registry + SBT |
| Verify | `POST /credentials/verify` | optional DID lookup | — | read Trust / DID / Registry / SBT |
| Revoke credential | `POST /credentials/revoke` | status revoked | `cred.revoked` | Registry + SBT revoke |
| Authorize issuer | `POST /trusted-entities/authorize` | — | — | Trust registry write |
| Revoke issuer | `POST /trusted-entities/revoke` | — | — | Trust registry write |
| Issuer status | `GET …/is-authorized-issuer` | — | — | Trust registry read |
| Get credential | `GET /credentials/{id}` | read | — | — |
| On-chain status | `GET …/on-chain/status` / `sbt` | — | — | Registry / SBT read |

---

## Contract write ownership

All registry/SBT **writes** are performed by the backend using `BESU_TRUST_ADMIN_PRIVATE_KEY` (contract `owner`), not by the end-user wallet directly. User wallets are used for **VC signing** (issuer key from HD mnemonic) and as **SBT recipients** (holder address).
