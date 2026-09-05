const EXPLORER_BASE = (import.meta.env.VITE_CHAINLENS_URL || 'http://localhost:8082').replace(
  /\/$/,
  '',
)

export function chainlensContractUrl(address) {
  if (!address) return null
  return `${EXPLORER_BASE}/contracts/${address}`
}

export function chainlensAddressUrl(address) {
  if (!address) return null
  return `${EXPLORER_BASE}/address/${address}`
}

export function chainlensTransactionUrl(txHash) {
  if (!txHash) return null
  return `${EXPLORER_BASE}/transactions/${txHash}`
}

/**
 * Chainlens Free returns HTTP 500 for /nfts/* — not supported in the free tier.
 * Prefer chainlensContractUrl() or the admin Certificate SBT page.
 */
export function chainlensNftUrl(address) {
  if (!address) return null
  return `${EXPLORER_BASE}/nfts/${address}`
}

export const CHAINLENS_NFT_UNSUPPORTED_NOTE =
  'Chainlens Free does not support NFT collection pages (/nfts/*). Open the contract page or use Certificate SBT in the admin portal.'
