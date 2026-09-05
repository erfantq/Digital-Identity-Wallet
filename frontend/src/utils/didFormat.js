export function truncateMiddle(value, start = 6, end = 4) {
  if (!value || value.length <= start + end + 3) return value || ''
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export function formatUtcDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

export function formatRegisteredAt(value) {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isNaN(numeric) && numeric > 1_000_000_000) {
    return formatUtcDate(numeric * 1000)
  }
  return String(value)
}

export function getDidMethodLabel(did) {
  if (!did) return 'Unknown'
  if (did.startsWith('did:ethr:')) return 'Ethr DID Method'
  const parts = did.split(':')
  if (parts.length >= 2) return `${parts[1]} DID Method`
  return 'DID Method'
}

export function extractVerificationMethod(doc) {
  const methods = doc?.verificationMethod || []
  const first = methods[0]
  if (!first || typeof first === 'string') {
    return { type: '—', blockchainAccountId: null, id: null }
  }
  return {
    type: first.type || '—',
    blockchainAccountId: first.blockchainAccountId || null,
    id: first.id || null,
  }
}

export function buildDidDocumentForDisplay(resolution) {
  const doc = resolution?.didDocument
  if (!doc) return null
  return {
    '@context': doc['@context'] ?? doc.context,
    id: doc.id,
    controller: doc.controller,
    verificationMethod: doc.verificationMethod,
    authentication: doc.authentication,
    assertionMethod: doc.assertionMethod,
    service: doc.service,
  }
}

export function isResolutionFound(resolution) {
  if (!resolution?.didDocument?.id) return false
  if (resolution.didDocumentMetadata?.deactivated === true) return true
  return !resolution?.didResolutionMetadata?.error
}

/** Health badge + alert for wallet / resolve DID UIs. */
export function deriveDidHealth(resolution, onChainStatus = null) {
  const error = resolution?.didResolutionMetadata?.error
  const deactivated =
    resolution?.didDocumentMetadata?.deactivated === true ||
    onChainStatus?.active === false ||
    error === 'DID is deactivated on-chain'

  if (deactivated) {
    return {
      key: 'deactivated',
      label: 'Deactivated',
      icon: 'cancel',
      badgeKind: 'inactive',
      alert: error || 'This DID is deactivated on-chain.',
      alertTone: 'error',
    }
  }

  if (error === 'DID not found') {
    return {
      key: 'not-found',
      label: 'Not found',
      icon: 'search_off',
      badgeKind: 'inactive',
      alert: 'DID not found',
      alertTone: 'error',
    }
  }

  if (error) {
    return {
      key: 'warning',
      label: 'Warning',
      icon: 'warning',
      badgeKind: 'pending',
      alert: error,
      alertTone: 'warning',
    }
  }

  return {
    key: 'healthy',
    label: 'Healthy',
    icon: 'check_circle',
    badgeKind: 'healthy',
    alert: null,
    alertTone: null,
  }
}

export async function copyToClipboard(text) {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
