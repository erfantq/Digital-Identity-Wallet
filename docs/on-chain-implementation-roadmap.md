# On-Chain Implementation Roadmap

این سند رودمپ عملیاتی پیاده‌سازی smart contractها و اتصال بک‌اند را مشخص می‌کند. مبنای آن:

- رودمپ کلی پروژه (`digital-identity-wallet_FUM.pdf`)
- وضعیت فعلی بک‌اند (`app/src`)
- قراردادهای موجود (`contracts/contracts`)
- مستند تحلیل بک‌اند (`docs/backend-flow-and-smart-contract-roadmap.md`)

هدف: رسیدن به **MVP on-chain** بدون ذخیره داده شخصی روی chain — فقط anchor، trust و revocation.

---

## 1. وضعیت فعلی

| مؤلفه | وضعیت | اتصال بک‌اند |
|--------|--------|-------------|
| `TrustedEntityRegistry` | ✅ پیاده شده | چک issuer قبل از صدور VC + API مدیریت |
| `DIDRegistry` | ✅ پیاده شده | consumer رویداد `did.created` + resolve با چک on-chain |
| `CredentialRegistry` (issuance + revocation) | ✅ پیاده شده | `registerCredential` + `revokeCredential` |
| Verify API برای RP | ❌ نشده | endpoint اختصاصی وجود ندارد |
| `CertificateSBT` | ❌ نشده (اختیاری) | فقط TODO برای NFT attachment |

### قراردادهای پیاده‌شده

- `contracts/contracts/TrustedEntityRegistry.sol`
- `contracts/contracts/DIDRegistry.sol`

### اتصالات فعال بک‌اند

| رویداد / endpoint | مسیر | رفتار |
|-------------------|------|--------|
| `user.created` | `app/src/did/events.py` → `handle_user_created` | ایجاد DID در DB |
| `did.created` | `app/src/did/events.py` → `handle_did_created` | `DIDRegistry.registerDid()` + ذخیره `tx_hash` / `block_number` |
| `POST /credentials/issue` | `app/src/credential/router.py` | چک `TrustedEntityRegistry.isAuthorizedIssuer()` |
| `cred.created` | `app/src/credential/router.py` | publish event — **بدون consumer** |
| `cred.revoked` | `app/src/credential/router.py` | publish event — **بدون consumer** |
| `GET /dids/{did}` | `app/src/did/service.py` | resolve از DB + مقایسه hash با chain |

### envهای blockchain فعلی

```env
BESU_RPC_URL=
BESU_CHAIN_ID=1337
BESU_TRUST_ADMIN_PRIVATE_KEY=
TRUSTED_ENTITY_REGISTRY_ADDRESS=
DID_REGISTRY_ADDRESS=
REQUIRE_TRUSTED_ISSUER=true
REQUIRE_DID_ON_CHAIN=true
CHECK_DID_ON_CHAIN_RESOLVE=true
```

---

## 2. قراردادهای مورد نیاز (MVP)

### 2.1 TrustedEntityRegistry — انجام شده

**نقش:** Trusted List برای PID Provider و EAA Provider (issuerهای مجاز دانشگاه).

**توابع کلیدی:**

- `authorizeIssuer(address)`
- `revokeIssuer(address)`
- `isAuthorizedIssuer(address)`

**اتصال بک‌اند:**

- `POST /credentials/issue` — pre-check قبل از صدور
- `GET/POST /blockchain/trusted-entities/...` — مدیریت توسط admin

---

### 2.2 DIDRegistry — انجام شده

**نقش:** anchor کردن DID و hash سند DID (نه خود سند کامل).

**Keying:** `didHash = keccak256(didString)`

**توابع کلیدی:**

- `registerDid(didHash, controller, documentHash)`
- `deactivateDid(didHash)`
- `getDidRecord(didHash)` / `isActive(didHash)`

**اتصال بک‌اند:**

- consumer رویداد `did.created`
- `GET /dids/{did}` — consistency check با chain
- `GET/POST /blockchain/dids/...`

---

### 2.3 CredentialRegistry — باید پیاده شود

**نقش:** ثبت proof صدور VC روی chain (hash + metadata، بدون payload کامل).

**داده on-chain پیشنهادی:**

| فیلد | منبع بک‌اند |
|------|-------------|
| `credentialIdHash` | `keccak256(credential_id)` |
| `credentialHash` | `calculate_credential_hash(signed_credential)` |
| `issuer` | آدرس Ethereum صادرکننده |
| `holderDidHash` | `keccak256(holder_did)` |
| `credentialType` | `type` (مثلاً `UniversityPIDCredential`) |
| `issuedAt` | timestamp صدور |

**توابع کلیدی پیشنهادی:**

- `registerCredential(...)`
- `getCredentialRecord(credentialIdHash)`
- `credentialExists(credentialIdHash)`
- event: `CredentialIssued`

**اتصال بک‌اند:**

- consumer رویداد `cred.created`
- payload فعلی event (آماده است):

```json
{
  "credential_id": "urn:uuid:...",
  "holder_did": "did:ethr:...",
  "issuer_did": "did:ethr:...",
  "credential_hash": "0x...",
  "issued_at": "2026-...",
  "type": "UniversityPIDCredential"
}
```

**Migration DB:** افزودن `credential_hash`, `tx_hash`, `block_number` به جدول `credentials` (در صورت نبود).

---

### 2.4 Revocation — داخل `CredentialRegistry`

**تصمیم:** revocation در همان `CredentialRegistry.sol` (نه قرارداد جدا).

**توابع:**

- `revokeCredential(credentialIdHash, reasonCode)`
- `getCredentialRecord(...)` → شامل `revokedAt` و `reasonCode`

**اتصال بک‌اند:**

- consumer رویداد `cred.revoked`
- `revokedAt == 0` یعنی active

**Migration DB (اختیاری):** `revoke_tx_hash`

---

### ~~2.4 CredentialStatusRegistry~~ (ادغام شد)

### 2.5 Verify API برای RP — API بک‌اند (نه smart contract)

**نقش:** سرویس عمومی برای Relying Party جهت اعتبارسنجی VC.

**Endpoint پیشنهادی:**

```
POST /credentials/verify
```

**ورودی:** VC JSON کامل (signed credential)

**خروجی پیشنهادی:**

```json
{
  "valid": true,
  "checks": {
    "signature": true,
    "issuer_trusted": true,
    "did_active": true,
    "issued_on_chain": true,
    "hash_match": true,
    "not_revoked": true
  },
  "errors": []
}
```

**مراحل verify (به ترتیب):**

1. verify امضای EIP-191 روی canonical JSON (بدون `proof`)
2. resolve issuer DID → `DIDRegistry.isActive()`
3. `TrustedEntityRegistry.isAuthorizedIssuer(issuerAddress)`
4. `CredentialRegistry.getCredentialRecord()` → وجود + تطابق hash
5. `CredentialRegistry` → `revokedAt == 0` یعنی not revoked
6. (اختیاری) بررسی expiry از خود VC
7. تطابق holder DID hash با رکورد on-chain

**پیاده‌سازی:** `app/src/credential/verification.py` + `POST /credentials/verify`

---

### 2.6 CertificateSBT — اختیاری (فاز بعد)

**نقش:** مدرک دوره‌ای غیرقابل انتقال (Soulbound Token) در wallet کاربر.

**وضعیت بک‌اند:** attachment به IPFS + TODO در `issue_credential`.

**توصیه:** برای MVP لازم نیست. PID و VC آموزشی با `CredentialRegistry` + hash کافی است.

---

## 3. مواردی که برای MVP لازم نیست

| مورد | دلیل |
|------|------|
| `CredentialSchemaRegistry` | governance نوع VC؛ بعد از formal شدن چند schema |
| `IssuerRegistry` جدا | همان `TrustedEntityRegistry` است |
| NFT/ERC-721 قابل انتقال | رودمپ SBT می‌گوید، نه collectible |

---

## 4. ترتیب پیاده‌سازی

### فاز 0 — آماده‌سازی

- [ ] ثبت تصمیم‌های طراحی:
  - chain ID و Besu RPC نهایی
  - keying: `credential_id` به‌صورت hash (`keccak256`)
  - revocation جدا یا merged
  - reason on-chain: فقط `reasonCode` / off-chain متن آزاد
- [ ] freeze کردن payload رویدادهای `cred.created` و `cred.revoked`
- [ ] تثبیت canonical JSON برای hash (issuance و verify یکسان باشند)

### فاز 1 — CredentialRegistry

- [ ] نوشتن `contracts/contracts/CredentialRegistry.sol`
- [ ] deploy + ABI + `contracts/deployments/CredentialRegistry-1337.json`
- [ ] `app/src/blockchain/abis/CredentialRegistry.json`
- [ ] `app/src/blockchain/credential_registry.py`
- [ ] env: `CREDENTIAL_REGISTRY_ADDRESS`
- [ ] `handle_cred_created` در `app/src/credential/events.py`
- [ ] subscribe در `app/src/main.py`
- [ ] Alembic migration: `credential_hash`, `tx_hash`, `block_number`
- [ ] تست E2E: issue → event → chain → DB

### فاز 2 — Revocation داخل CredentialRegistry

- [x] `revokeCredential` در `CredentialRegistry.sol`
- [x] `handle_cred_revoked` + subscribe در `main.py`
- [x] migration: `revoke_tx_hash`
- [ ] تست E2E: issue → revoke → `revoked=true` روی chain

### فاز 3 — Verify API

- [x] `app/src/credential/verification.py` (سرویس verify)
- [x] `POST /credentials/verify` در router
- [ ] تست سناریوها:
  - VC معتبر
  - revoked
  - issuer غیرمجاز
  - hash mismatch
  - DID غیرفعال

### فاز 4 — Hardening

- [ ] pre-check issuance: issuer authorized + holder DID active on-chain
- [ ] consistency check در retrieve/list (DB vs chain)
- [ ] retry/reconciliation برای chain write failure
- [ ] env flag: `REQUIRE_CREDENTIAL_ON_CHAIN`
- [ ] (اختیاری) `GET /blockchain/credentials/{credential_id}/status`

### فاز 5 — کیفیت و DevOps

- [ ] تست خودکار (unit + integration با Besu local)
- [ ] به‌روزرسانی `.env.example`
- [ ] runbook deploy و authorize issuer

### فاز 6 — اختیاری (بعد از MVP)

- [ ] `CertificateSBT` + اتصال attachment
- [ ] `CredentialSchemaRegistry`

---

## 5. نقشه اتصال (خلاصه)

```
user.created
  └─► create_did_service (DB)
        └─► did.created
              └─► DIDRegistry.registerDid ✅

POST /credentials/issue
  ├─► TrustedEntityRegistry.isAuthorizedIssuer ✅
  ├─► sign + save DB
  └─► cred.created
        └─► CredentialRegistry.registerCredential ❌

POST /credentials/revoke
  ├─► update DB
  └─► cred.revoked
        └─► CredentialRegistry.revokeCredential ✅

POST /credentials/verify (RP)
  ├─► verify EIP-191 signature
  ├─► DIDRegistry.isActive
  ├─► TrustedEntityRegistry.isAuthorizedIssuer
  ├─► CredentialRegistry (exist + hash + revoked)
  └─► (revocation در همان CredentialRegistry)
```

---

## 6. env پیشنهادی (بعد از تکمیل MVP)

```env
# موجود
BESU_RPC_URL=http://127.0.0.1:8545
BESU_CHAIN_ID=1337
BESU_TRUST_ADMIN_PRIVATE_KEY=
TRUSTED_ENTITY_REGISTRY_ADDRESS=
DID_REGISTRY_ADDRESS=
REQUIRE_TRUSTED_ISSUER=true
REQUIRE_DID_ON_CHAIN=true
CHECK_DID_ON_CHAIN_RESOLVE=true

# جدید
CREDENTIAL_REGISTRY_ADDRESS=
REQUIRE_CREDENTIAL_ON_CHAIN=true
CHECK_CREDENTIAL_ON_CHAIN_VERIFY=true
```

---

## 7. Definition of Done (MVP on-chain)

- [x] هر DID جدید on-chain anchor می‌شود
- [x] issuer قبل از صدور VC در Trusted List چک می‌شود
- [x] هر VC صادرشده در `CredentialRegistry` ثبت می‌شود
- [x] هر VC ابطال‌شده در `CredentialRegistry.revokeCredential` ثبت می‌شود
- [x] RP می‌تواند با `POST /credentials/verify` VC را بدون دسترسی به DB داخلی validate کند
- [x] `tx_hash` / `block_number` / `revoke_tx_hash` برای DID و VC در DB قابل audit است
- [x] idempotency برای re-delivery رویدادها (مثل `handle_did_created`)

---

## 8. تصمیم‌های باز (قبل از شروع فاز 1)

| موضوع | گزینه‌ها | پیشنهاد MVP |
|--------|---------|-------------|
| Keying credential | string vs `keccak256(credential_id)` | `keccak256` (هم‌راستا با DIDRegistry) |
| Revocation contract | جدا vs merged | **merged** در `CredentialRegistry` |
| Reason on-chain | `reasonCode` vs full text | فقط code؛ متن در DB |
| Chain write timing | inline vs event consumer | event consumer (الگوی `did.created`) |
| Holder privacy | `holderDidHash` vs full DID | hash |
| Failure handling | fail issuance vs eventual consistency | eventual consistency + reconciliation |

---

## 9. مراجع

- رودمپ کلی: `digital-identity-wallet_FUM.pdf`
- تحلیل بک‌اند: `docs/backend-flow-and-smart-contract-roadmap.md`
- قراردادها: `contracts/contracts/`
- integration layer: `app/src/blockchain/`
- event handlers: `app/src/did/events.py`, `app/src/credential/events.py`
