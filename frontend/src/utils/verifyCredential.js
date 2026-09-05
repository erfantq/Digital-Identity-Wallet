export const CHECK_GROUPS = [
  {
    id: 'crypto',
    title: 'Cryptographic & Issuer',
    icon: 'security',
    items: [
      { key: 'signature', label: 'Signature valid' },
      { key: 'did_active', label: 'Issuer DID active' },
      { key: 'issuer_trusted', label: 'Issuer trusted' },
    ],
  },
  {
    id: 'onchain',
    title: 'On-chain Credential',
    icon: 'link',
    items: [
      { key: 'issued_on_chain', label: 'Registered on-chain' },
      { key: 'hash_match', label: 'Hash matches on-chain' },
      { key: 'not_revoked', label: 'Not revoked on-chain' },
      { key: 'holder_match', label: 'Holder matches on-chain' },
    ],
  },
  {
    id: 'sbt',
    title: 'Certificate SBT',
    icon: 'workspace_premium',
    items: [
      { key: 'sbt_minted', label: 'Certificate SBT minted' },
      { key: 'sbt_owner_match', label: 'SBT owner matches holder' },
      { key: 'sbt_not_revoked', label: 'SBT not revoked' },
    ],
  },
]

export const FLAT_CHECKS = CHECK_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
)

export function parseCredentialJson(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Paste a credential JSON object or upload a file.')
  }

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Invalid JSON. Check the credential format and try again.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Credential must be a JSON object.')
  }

  return parsed
}

export function checkState(value) {
  if (value === true) return 'passed'
  if (value === false) return 'failed'
  return 'skipped'
}

export function formatIssuanceDate(credential) {
  const raw = credential?.issuanceDate || credential?.validFrom
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

export function buildMobileSummary(result) {
  const { checks = {}, errors = [] } = result
  const summaries = []

  const signatureOk = checks.signature === true
  const issuerOk =
    (checks.did_active === true || checks.did_active == null) &&
    (checks.issuer_trusted === true || checks.issuer_trusted == null) &&
    signatureOk

  summaries.push({
    id: 'issuer',
    title: 'Issuer Identity',
    icon: 'verified',
    ok: issuerOk && checks.signature !== false,
    text: issuerOk
      ? 'Signed by verified institutional registrar (FUM).'
      : errors.find((e) => e.toLowerCase().includes('issuer')) ||
        'Issuer identity could not be fully verified.',
  })

  summaries.push({
    id: 'crypto',
    title: 'Cryptographic Integrity',
    icon: 'lock',
    ok: signatureOk,
    text: signatureOk
      ? 'Signature is valid and content has not been tampered with.'
      : errors.find((e) => e.toLowerCase().includes('signature')) ||
        'Signature verification failed.',
  })

  const statusOk =
    checks.not_revoked !== false &&
    checks.issued_on_chain !== false &&
    result.valid

  summaries.push({
    id: 'status',
    title: 'Credential Status',
    icon: 'event_available',
    ok: statusOk,
    text: statusOk
      ? 'Not expired and not present on any revocation lists.'
      : errors.find((e) => e.toLowerCase().includes('revok')) ||
        'Credential status checks did not pass.',
  })

  return summaries
}
