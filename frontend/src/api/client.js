import { TOKEN_STORAGE_KEY } from '@/utils/jwt'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

function extractErrorMessage(body, fallback) {
  if (!body) return fallback
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => item.msg).join(', ')
  }
  if (body.message) return body.message
  return fallback
}

export async function apiRequest(path, options = {}) {
  const { auth = false, form = false, body, headers, ...rest } = options

  const requestHeaders = new Headers(headers)

  if (auth) {
    const token = getStoredToken()
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let requestBody

  if (body != null) {
    if (body instanceof FormData) {
      requestBody = body
    } else if (body instanceof URLSearchParams) {
      requestBody = body
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded')
      }
    } else if (form) {
      requestBody = body
    } else if (typeof body === 'object') {
      requestHeaders.set('Content-Type', 'application/json')
      requestBody = JSON.stringify(body)
    } else {
      requestBody = body
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (response.status === 401 && auth) {
    setStoredToken(null)
    window.dispatchEvent(new CustomEvent('diw:session-expired'))
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, response.statusText || 'Request failed'),
      response.status,
      payload,
    )
  }

  return payload
}

export async function apiSuccessData(path, options = {}) {
  const payload = await apiRequest(path, options)
  return payload.data
}

export { API_BASE_URL }
