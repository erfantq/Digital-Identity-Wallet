import { apiSuccessData } from './client'

/** GET /trusted-entities/{account}/is-authorized-issuer */
export async function checkAuthorizedIssuer(account) {
  return apiSuccessData(
    `/trusted-entities/${encodeURIComponent(account)}/is-authorized-issuer`,
  )
}

/** POST /trusted-entities/authorize (super_admin-only) */
export async function authorizeIssuer(account) {
  return apiSuccessData('/trusted-entities/authorize', {
    method: 'POST',
    auth: true,
    body: { account },
  })
}

/** POST /trusted-entities/revoke (super_admin-only) */
export async function revokeIssuer(account) {
  return apiSuccessData('/trusted-entities/revoke', {
    method: 'POST',
    auth: true,
    body: { account },
  })
}
