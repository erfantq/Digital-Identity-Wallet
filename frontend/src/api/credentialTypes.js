import { apiSuccessData } from './client'

/** GET /credential-types (admin-only) */
export async function listCredentialTypes() {
  return apiSuccessData('/credential-types', { auth: true })
}

/** GET /credential-types/{typeId} */
export async function getCredentialType(typeId) {
  return apiSuccessData(`/credential-types/${encodeURIComponent(typeId)}`, {
    auth: true,
  })
}

/** POST /credential-types (super_admin-only) */
export async function createCredentialType(payload) {
  return apiSuccessData('/credential-types', {
    method: 'POST',
    auth: true,
    body: payload,
  })
}
