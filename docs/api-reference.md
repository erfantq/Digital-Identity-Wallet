# API Reference

Base URL (local): `http://localhost:8000`

Interactive OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Conventions

### Authentication

Most protected endpoints expect:

```http
Authorization: Bearer <access_token>
```

Obtain a token from `POST /auth/login`.

### Roles

| Dependency | Allowed roles |
|------------|---------------|
| Authenticated user | Any valid JWT |
| Admin | `admin`, `super_admin` |
| Super admin | `super_admin` only |

### Response envelope

Many endpoints return:

```json
{
  "status": "success",
  "message": "…",
  "data": { }
}
```

Some auth/DID endpoints return Pydantic models directly (see each endpoint).

### Pagination

List endpoints commonly accept:

| Query | Default | Notes |
|-------|---------|-------|
| `page` | `1` | 1-based |
| `page_size` | `10` or `20` | Max usually `100` |

Paginated `data` typically includes `items` and `pagination`.

---

## Auth — `/auth`

### `POST /auth/login`

Public. OAuth2 password form (`application/x-www-form-urlencoded`).

| Field | Type | Required |
|-------|------|----------|
| `username` | string | yes |
| `password` | string | yes |

**Response (`LoginResponse`):**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

JWT claims include `sub`, `user_id`, `role`, `wallet_index`, and `eth_address`.

---

### `POST /auth/register`

**Auth:** admin / super_admin

Registers a user, derives an HD wallet, and publishes `user.created` (which triggers DID creation).

**Body (`RegisterRequest`):**

```json
{
  "username": "student01",
  "password": "secret",
  "email": "student01@example.com",
  "role": "student"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `username` | string | required |
| `password` | string | required |
| `email` | string | optional |
| `role` | enum | `user`, `admin`, `super_admin`, `student`, `teacher` (default `user`) |

**Response (`RegisterResponse`):** `user_id`, `username`, `email`, `role`, `message`

---

### `GET /auth/users`

**Auth:** admin / super_admin

List users with optional filters.

| Query | Type | Notes |
|-------|------|-------|
| `page` | int | default `1` |
| `page_size` | int | default `20`, max `100` |
| `search` | string | optional |
| `role` | enum | optional |

---

### `GET /auth/users/{user_id}`

**Auth:** admin / super_admin

Returns a single user profile.

---

### `GET /auth/admin/dashboard`

**Auth:** admin / super_admin

Aggregate admin dashboard statistics.

---

### `GET /auth/admins`

**Auth:** super_admin

Paginated admin directory (`page`, `page_size`, optional `search`).

---

### `GET /auth/admins/{user_id}`

**Auth:** super_admin

Admin user detail.

---

### `DELETE /auth/admins/{user_id}`

**Auth:** super_admin

Deletes an admin account (subject to service-level safety rules).

---

## DIDs — `/dids`

DID format used by this project:

```text
did:ethr:{user_id}:{ethereum_address}
```

### `POST /dids/`

**Auth:** admin / super_admin

Create a DID for a user.

**Body (`DIDCreate`):**

```json
{
  "user_id": 6,
  "controller": null
}
```

**Response:** `DIDDocument`

In normal registration flows, DIDs are created automatically via the `user.created` event; this endpoint is for explicit/admin creation.

---

### `GET /dids/me`

**Auth:** any authenticated user

Resolve the current user’s DID. Same resolution shape as `GET /dids/{did}`.

**Response (`DIDResolution`):** W3C-style object with `didDocument`, `didResolutionMetadata`, and `didDocumentMetadata`.

---

### `GET /dids/{did}`

**Auth:** public

Resolve a DID string to its document.

Example:

```http
GET /dids/did:ethr:6:0x1C7e13956dE0be618365E9229796c697638E4821
```

When `CHECK_DID_ON_CHAIN_RESOLVE` is enabled, resolution may compare the stored document hash with `DIDRegistry`.

---

### `GET /dids/holder-profile`

**Auth:** admin / super_admin

Look up the wallet/user account linked to a holder DID (used by the issue-credential UI).

| Query | Required |
|-------|----------|
| `did` | yes |

**Example `data`:**

```json
{
  "user_id": 6,
  "username": "student01",
  "email": "student01@example.com",
  "role": "student",
  "did": "did:ethr:6:0x…",
  "ethereum_address": "0x…",
  "did_active": true
}
```

---

### `GET /dids/on-chain/status`

**Auth:** public

| Query | Required |
|-------|----------|
| `did` | yes |

Returns the on-chain `DIDRegistry` record for the DID.

---

### `POST /dids/on-chain/deactivate`

**Auth:** admin / super_admin

Deactivate a DID on-chain and mark it inactive in the database.

**Body:**

```json
{
  "did": "did:ethr:6:0x…"
}
```

---

## Credentials — `/credentials`

### `POST /credentials/verify`

**Auth:** public (Relying Party endpoint)

**Body:**

```json
{
  "credential": {
    "@context": ["…"],
    "id": "urn:uuid:…",
    "type": ["VerifiableCredential", "UniversityPIDCredential"],
    "issuer": "did:ethr:…",
    "credentialSubject": { },
    "proof": { }
  }
}
```

**Response `data`:** verification result with `valid`, per-check results, errors, and details.

---

### `POST /credentials/issue`

**Auth:** admin / super_admin

`multipart/form-data`:

| Part | Type | Required | Notes |
|------|------|----------|-------|
| `cred_json` | string (JSON) | yes | Serialized `CredentialIssue` |
| `attachment` | file | no | Uploaded to IPFS when present |

**`cred_json` example:**

```json
{
  "holder_did": "did:ethr:6:0x1C7e13956dE0be618365E9229796c697638E4821",
  "type": "UniversityPIDCredential",
  "credential_data": {
    "firstName": "Erfan",
    "lastName": "Taghavi",
    "nationalId": "0920000000",
    "username": "student01",
    "university": "Ferdowsi University of Mashhad",
    "faculty": "Engineering",
    "department": "Computer Engineering",
    "degreeLevel": "Bachelor",
    "enrollmentYear": 2021,
    "currentTerm": 8,
    "role": "Student"
  }
}
```

Behavior summary:

1. Validates holder DID and linked user
2. Derives issuer wallet from JWT `wallet_index`
3. Optionally requires issuer authorization on `TrustedEntityRegistry`
4. Builds and EIP-191-signs the VC
5. Stores the credential and publishes `cred.created` for async chain + SBT work

---

### `GET /credentials/users/auth/credentials`

**Auth:** any authenticated user

Lists credentials where the current user is the holder (via their DID). Supports `page` / `page_size`.

Each item includes status, hashes, chain/SBT fields, attached document URIs, and the full credential JSON.

---

### `GET /credentials/users/{username}/credentials`

**Auth:** public

Lists credentials for a username’s holder DID. Supports `page` / `page_size`.

---

### `GET /credentials/{credential_id}`

**Auth:** public

Fetch one credential by id (for example `urn:uuid:…`), including revocation and SBT metadata.

---

### `POST /credentials/revoke`

**Auth:** admin / super_admin

| Param | In | Required | Notes |
|-------|----|----------|-------|
| `credential_id` | query | yes | Full credential id |
| `reason` | query | no | Human-readable reason |
| `reason_code` | query | no | Compact on-chain code (default `0`) |

Marks the credential revoked in DB and publishes `cred.revoked` for async on-chain revocation.

---

### `GET /credentials/on-chain/status`

**Auth:** public

| Query | Required |
|-------|----------|
| `credential_id` | yes |

Returns the `CredentialRegistry` on-chain record.

---

### `GET /credentials/on-chain/sbt`

**Auth:** public

| Query | Required |
|-------|----------|
| `credential_id` | yes |

Returns the `CertificateSBT` on-chain record for the credential.

---

## Trusted Entities — `/trusted-entities`

### `GET /trusted-entities/{account}/is-authorized-issuer`

**Auth:** public

Check whether an Ethereum address is an authorized issuer.

**Example `data`:**

```json
{
  "account": "0x…",
  "is_authorized_issuer": true
}
```

---

### `POST /trusted-entities/authorize`

**Auth:** super_admin

**Body:**

```json
{
  "account": "0xAbc…"
}
```

Calls `TrustedEntityRegistry.authorizeIssuer`.

---

### `POST /trusted-entities/revoke`

**Auth:** super_admin

**Body:**

```json
{
  "account": "0xAbc…"
}
```

Revokes issuer authorization on-chain.

---

## Observability

Prometheus metrics are exposed by the FastAPI app (via `prometheus-fastapi-instrumentator`). See the live OpenAPI/Swagger UI for the exact metrics path after startup.

---

## Quick Endpoint Matrix

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | Public |
| POST | `/auth/register` | Admin |
| GET | `/auth/users` | Admin |
| GET | `/auth/users/{user_id}` | Admin |
| GET | `/auth/admin/dashboard` | Admin |
| GET | `/auth/admins` | Super admin |
| GET | `/auth/admins/{user_id}` | Super admin |
| DELETE | `/auth/admins/{user_id}` | Super admin |
| POST | `/dids/` | Admin |
| GET | `/dids/me` | Authenticated |
| GET | `/dids/{did}` | Public |
| GET | `/dids/holder-profile` | Admin |
| GET | `/dids/on-chain/status` | Public |
| POST | `/dids/on-chain/deactivate` | Admin |
| POST | `/credentials/verify` | Public |
| POST | `/credentials/issue` | Admin |
| GET | `/credentials/users/auth/credentials` | Authenticated |
| GET | `/credentials/users/{username}/credentials` | Public |
| GET | `/credentials/{credential_id}` | Public |
| POST | `/credentials/revoke` | Admin |
| GET | `/credentials/on-chain/status` | Public |
| GET | `/credentials/on-chain/sbt` | Public |
| GET | `/trusted-entities/{account}/is-authorized-issuer` | Public |
| POST | `/trusted-entities/authorize` | Super admin |
| POST | `/trusted-entities/revoke` | Super admin |
