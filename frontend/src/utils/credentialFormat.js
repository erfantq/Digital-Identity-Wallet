export function truncateMiddle(value, start = 8, end = 6) {
  if (!value || value.length <= start + end + 3) return value || ''
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export function formatCredentialDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getIssuanceDate(item) {
  return item?.credential?.issuanceDate || item?.credential?.validFrom || null
}

export function isActiveCredential(item) {
  return String(item?.status || '').toLowerCase() === 'active'
}

export function isRevokedCredential(item) {
  return String(item?.status || '').toLowerCase() === 'revoked'
}

export function statusLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'revoked') return 'Revoked'
  if (normalized === 'expired') return 'Expired'
  return status || 'Unknown'
}

import { ipfsGatewayUrl } from '@/utils/issueCredential'

export function getCredentialIpfsLinks(item) {
  const subject = item?.credential?.credentialSubject || {}
  const metadataUri = item?.sbt_token_uri || null
  const documentUri = subject.attachedDocument || item?.attached_document || null

  const metadataUrl =
    item?.nft_metadata_gateway_url || (metadataUri ? ipfsGatewayUrl(metadataUri) : null)
  const documentUrl =
    item?.attached_document_gateway_url || (documentUri ? ipfsGatewayUrl(documentUri) : null)

  // SBT image is the attached certificate document pinned as NFT image.
  const sbtImageUrl = documentUrl

  return {
    metadata: metadataUrl ? { uri: metadataUri, url: metadataUrl } : null,
    document: documentUrl ? { uri: documentUri, url: documentUrl } : null,
    sbtImage: sbtImageUrl ? { uri: documentUri, url: sbtImageUrl } : null,
  }
}

export function getSbtImageUrl(item) {
  return getCredentialIpfsLinks(item).sbtImage?.url || null
}
