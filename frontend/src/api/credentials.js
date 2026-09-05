import { apiSuccessData } from './client'

/** POST /credentials/issue (admin-only, multipart) */
export async function issueCredential(payload, attachment) {
  const form = new FormData()
  form.append('cred_json', JSON.stringify(payload))
  if (attachment) form.append('attachment', attachment)

  return apiSuccessData('/credentials/issue', {
    method: 'POST',
    auth: true,
    form: true,
    body: form,
  })
}

/** POST /credentials/verify */
export async function verifyCredential(credential) {
  return apiSuccessData('/credentials/verify', {
    method: 'POST',
    body: { credential },
  })
}

/** GET /credentials/users/auth/credentials */
export async function listAuthUserCredentials(page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return apiSuccessData(`/credentials/users/auth/credentials?${params}`, { auth: true })
}

/** GET /credentials/users/{username}/credentials */
export async function listCredentialsByUsername(username, page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return apiSuccessData(
    `/credentials/users/${encodeURIComponent(username)}/credentials?${params}`,
  )
}

/** GET /credentials/{credential_id} */
export async function getCredential(credentialId) {
  return apiSuccessData(`/credentials/${encodeURIComponent(credentialId)}`)
}

/** GET /credentials/on-chain/status?credential_id=... */
export async function getCredentialOnChainStatus(credentialId) {
  const params = new URLSearchParams({ credential_id: credentialId })
  return apiSuccessData(`/credentials/on-chain/status?${params}`)
}

/** GET /credentials/on-chain/sbt?credential_id=... */
export async function getCertificateSbtStatus(credentialId) {
  const params = new URLSearchParams({ credential_id: credentialId })
  return apiSuccessData(`/credentials/on-chain/sbt?${params}`)
}

/** POST /credentials/revoke (admin-only) */
export async function revokeCredential(credentialId, reason, reasonCode = 0) {
  const params = new URLSearchParams({
    credential_id: credentialId,
    reason_code: String(reasonCode),
  })
  if (reason) params.set('reason', reason)

  return apiSuccessData(`/credentials/revoke?${params}`, {
    method: 'POST',
    auth: true,
  })
}
