export function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}

export function authUserFromToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.sub || payload.user_id == null || !payload.role) return null

  return {
    username: payload.sub,
    userId: payload.user_id,
    role: payload.role,
    walletIndex: payload.wallet_index,
    ethAddress: payload.eth_address,
  }
}

export const TOKEN_STORAGE_KEY = 'diw_access_token'
