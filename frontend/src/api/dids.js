import { apiRequest, apiSuccessData } from './client'

/** POST /dids/ (admin-only) */
export async function createDid(payload) {
  return apiRequest('/dids/', {
    method: 'POST',
    auth: true,
    body: payload,
  })
}

/** GET /dids/me (auth required) */
export async function resolveMyDid() {
  return apiRequest('/dids/me', { auth: true })
}

/** GET /dids/holder-profile?did=... (admin-only) */
export async function getHolderProfileByDid(did) {
  const params = new URLSearchParams({ did })
  return apiSuccessData(`/dids/holder-profile?${params}`, { auth: true })
}

/** GET /dids/{did} */
export async function resolveDid(did) {
  return apiRequest(`/dids/${encodeURIComponent(did)}`)
}

/** GET /dids/on-chain/status?did=... */
export async function getDidOnChainStatus(did) {
  const params = new URLSearchParams({ did })
  return apiSuccessData(`/dids/on-chain/status?${params}`)
}

/** POST /dids/on-chain/deactivate (admin-only) */
export async function deactivateDidOnChain(did) {
  return apiSuccessData('/dids/on-chain/deactivate', {
    method: 'POST',
    auth: true,
    body: { did },
  })
}
