# DID, DID Document & Credential Fields

This document explains the fields that this project actually creates, stores, or returns — not only the generic W3C definitions.

Primary code sources:

- DID / Document: `app/src/did/schemas.py`, `app/src/did/models.py`, `app/src/did/service.py`
- Credential: `app/src/credential/schemas.py`, `app/src/credential/models.py`, `app/src/credential/router.py`, `app/src/credential/cryptography.py`
- Issue form (frontend): `frontend/src/utils/issueCredential.js`

---

## 1. DID (identifier)

### DID string format in this project

```text
did:ethr:{user_id}:{ethereum_address}
```

Example:

```text
did:ethr:12:0xAbC123…
```

| Part | Meaning |
|------|---------|
| `did` | Standard Decentralized Identifier prefix |
| `ethr` | Ethereum-based DID method (this project creates real user DIDs with this method only) |
| `user_id` | User id from the `users` table |
| `ethereum_address` | Wallet address derived from the user’s `wallet_index` (`0x` + 40 hex chars) |

A DID is a stable **identity identifier**. It is not the identity document itself — keys and controllers live in the **DID Document**.

### Database record (`dids`)

| Field | Type | Meaning |
|-------|------|---------|
| `id` | int | Internal primary key |
| `user_id` | int | Owner in the `users` table |
| `did` | string | Full DID string (unique) |
| `ethereum_address` | string | On-chain address bound to the DID |
| `document` | JSON/string | Cached DID Document |
| `document_hash` | string | `keccak256` of the sorted Document JSON; used when anchoring on `DIDRegistry` |
| `tx_hash` | string? | On-chain registration transaction hash |
| `block_number` | int? | Block number of registration |
| `active` | bool | Active flag in the DB cache (cleared on deactivate) |
| `created_at` / `updated_at` | datetime | Created / last updated timestamps |

---

## 2. DID Document

A W3C document that states **who controls** the DID and **which key/address** may be used for authentication or assertions.

### Top-level Document fields

| Field | Meaning in this project |
|-------|-------------------------|
| `@context` | Usually `https://www.w3.org/ns/did/v1` — DID vocabulary |
| `id` | The DID string itself |
| `controller` | Entity that controls the Document; defaults to the DID unless set at creation |
| `verificationMethod` | List of verification methods (keys / accounts) |
| `authentication` | References methods allowed to prove control of the DID; for `ethr` typically `["{did}#owner"]` |
| `assertionMethod` | Optional in schema; keys allowed to sign claims / VCs — not populated in the current `ethr` builder |
| `keyAgreement` | Optional; keys for encrypted key exchange |
| `capabilityInvocation` / `capabilityDelegation` | Optional; advanced capability control |
| `service` | Optional; service endpoints tied to the identity |

### `verificationMethod` (for `did:ethr`)

As built in code:

| Field | Example / meaning |
|-------|-------------------|
| `id` | `{did}#owner` — unique id of this method inside the Document |
| `type` | `EcdsaSecp256k1RecoveryMethod2020` — secp256k1 signature with address recovery |
| `controller` | The same DID |
| `blockchainAccountId` | `eip155:{chainId}:{address}` — binds the key to a chain account (e.g. Besu chain ID `1337`) |

Alternative schema fields (used more for other methods such as `key` / `web`):

| Field | Meaning |
|-------|---------|
| `publicKeyJwk` | Public key as JWK |
| `publicKeyBase58` | Public key in Base58 |
| `publicKeyMultibase` | Public key in multibase |

### Resolution response (`GET /dids/{did}`)

Besides the Document, metadata is returned:

**`didResolutionMetadata`**

| Field | Meaning |
|-------|---------|
| `contentType` | Usually `application/did+json` |
| `retrieved` | Retrieval time (ISO-8601) |
| `error` | Error detail; e.g. DID not found, or local hash mismatch vs on-chain |

**`didDocumentMetadata`**

| Field | Meaning |
|-------|---------|
| `created` / `updated` | From the DB record |
| `deactivated` | When on-chain checks are enabled: `true` if the registry marks the DID inactive |
| `versionId` | Document version (usually empty in the current implementation) |

---

## 3. Verifiable Credential (VC)

A signed claim that an issuer makes about a holder. The JSON stored in the DB is the full VC (including `proof`).

### Top-level VC fields

| Field | Meaning |
|-------|---------|
| `@context` | At least `https://www.w3.org/2018/credentials/v1` — W3C VC vocabulary |
| `id` | Unique credential id; format `urn:uuid:…` |
| `type` | Array; always includes `VerifiableCredential` plus a university type (e.g. `UniversityPIDCredential`) |
| `issuer` | Issuer DID (admin / issuer) |
| `issuanceDate` | Issuance time (ISO-8601, UTC) |
| `credentialSubject` | Claims about the holder (see below) |
| `proof` | Signature proof (see below) |

### Credential types in the UI

| `type` | Purpose |
|--------|---------|
| `UniversityPIDCredential` | Base identity for a university member |
| `UniversityEnrollmentCredential` | Active enrollment / employment status |
| `UniversityCertificateCredential` | Degree / graduation certificate |

---

## 4. `credentialSubject`

The subject of the claim. The backend always sets:

| Field | Meaning |
|-------|---------|
| `id` | Holder DID (same as `holder_did`) |
| `username` | Username of the account linked to that DID |
| `attachedDocument` | Optional IPFS URI for an attached file, e.g. `ipfs://…` |

Remaining fields come from the issue form’s `credential_data`.

### Shared fields (common across types)

| Field | Meaning |
|-------|---------|
| `firstName` / `lastName` | Given name and family name |
| `nationalId` | National ID (required in the UI for PID) |
| `university` | University name (default: Ferdowsi University of Mashhad) |
| `faculty` | Faculty |
| `department` | Department / unit |

### By credential type

**`UniversityPIDCredential`**

| Field | Meaning |
|-------|---------|
| `role` | Member role: `Student` or `Teacher` (derived from the holder account role, not a free-form UI override) |

**`UniversityEnrollmentCredential`**

| Field | Applies to | Meaning |
|-------|------------|---------|
| `role` | Both | `Student` / `Teacher` |
| `degreeLevel` | Student | Degree level: Bachelor / Master / PhD |
| `enrollmentYear` | Student | Year of enrollment |
| `currentTerm` | Student | Current term |
| `academicRank` | Teacher | Academic rank |
| `employmentYear` | Teacher | Year employment started |

**`UniversityCertificateCredential`**

| Field | Meaning |
|-------|---------|
| `degreeLevel` | Degree level of the certificate |
| `programName` | Program / field of study |
| `graduationDate` | Graduation date |
| `honors` | Honors (optional) |
| `gpa` | GPA (optional) |

Note: if `studentId` appears in the input, it is stripped at issuance time.

---

## 5. `proof` (VC signature)

The signature covers the canonical JSON of the entire VC **without** the `proof` object (EIP-191 / `personal_sign`).

| Field | Meaning |
|-------|---------|
| `type` | `EthereumEip191Signature2026` — this project’s proof type |
| `created` | Proof creation time |
| `proofPurpose` | `assertionMethod` — signature asserts the VC claims |
| `verificationMethod` | Reference to the issuer key; usually `{issuer_did}#controller` |
| `signature` | Hex signature (`0x…`) recoverable to the issuer’s Ethereum address |

From `signature`, the signer address can be recovered and compared to the issuer DID’s address.

---

## 6. Credential database record (`credentials`)

| Field | Meaning |
|-------|---------|
| `id` | Internal primary key |
| `credential_id` | Same as the VC JSON `id` (`urn:uuid:…`) |
| `issuer` | Issuer DID |
| `holder_did` | Holder DID |
| `type` | University credential type (e.g. `UniversityPIDCredential`) |
| `credential` | Full signed VC JSON |
| `credential_hash` | `keccak256` of the canonical signed VC JSON; used for on-chain register / match |
| `tx_hash` / `block_number` | Registration on `CredentialRegistry` |
| `revoke_tx_hash` | Revoke transaction on the registry |
| `sbt_token_id` | Soulbound token id (if minted) |
| `sbt_tx_hash` | Mint transaction |
| `sbt_token_uri` | NFT metadata URI (usually IPFS) |
| `sbt_revoke_tx_hash` | Revoke transaction on the SBT |
| `status` | `active` / `revoked` / `expired` |
| `revoked_at` / `revoked_by` / `revoke_reason` | Revocation details in the DB |
| `created_at` / `updated_at` | Created / updated timestamps |

---

## 7. Issue API input (summary)

`POST /credentials/issue` logical body (JSON inside multipart):

| Field | Meaning |
|-------|---------|
| `holder_did` | DID of the credential recipient |
| `type` | University VC type |
| `credential_data` | Claim dictionary merged into `credentialSubject` |

`issuer` is taken from the logged-in admin’s DID, not from client input.

---

## 8. Short examples

**DID Document (`ethr`):**

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ethr:12:0xAbC…",
  "controller": "did:ethr:12:0xAbC…",
  "verificationMethod": [
    {
      "id": "did:ethr:12:0xAbC…#owner",
      "type": "EcdsaSecp256k1RecoveryMethod2020",
      "controller": "did:ethr:12:0xAbC…",
      "blockchainAccountId": "eip155:1337:0xAbC…"
    }
  ],
  "authentication": ["did:ethr:12:0xAbC…#owner"]
}
```

**VC (abbreviated):**

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "id": "urn:uuid:…",
  "type": ["VerifiableCredential", "UniversityPIDCredential"],
  "issuer": "did:ethr:1:0xIssuer…",
  "issuanceDate": "2026-09-06T12:00:00+00:00",
  "credentialSubject": {
    "id": "did:ethr:12:0xHolder…",
    "username": "student01",
    "firstName": "Ali",
    "lastName": "Karimi",
    "nationalId": "…",
    "university": "Ferdowsi University of Mashhad",
    "role": "Student"
  },
  "proof": {
    "type": "EthereumEip191Signature2026",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:ethr:1:0xIssuer…#controller",
    "signature": "0x…"
  }
}
```

---

## Related docs

- Architecture & flows: [architecture-and-implementation.md](./architecture-and-implementation.md)
- API: [api-reference.md](./api-reference.md)
- Product overview: [overview.md](./overview.md)
