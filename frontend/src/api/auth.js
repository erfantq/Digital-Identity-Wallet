import { apiRequest, apiSuccessData } from './client'

/** POST /auth/login */
export async function login(username, password) {
  const form = new URLSearchParams()
  form.set('username', username)
  form.set('password', password)

  return apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
}

/** POST /auth/register (admin / super_admin) */
export async function registerUser(payload) {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    auth: true,
    body: payload,
  })
  return {
    data: response.data,
    message: response.message,
  }
}

/** GET /auth/users (admin-only) */
export async function listUsers({ page = 1, pageSize = 20, search = '', role = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  if (search.trim()) params.set('search', search.trim())
  if (role) params.set('role', role)

  return apiSuccessData(`/auth/users?${params}`, { auth: true })
}

/** GET /auth/users/{userId} (admin-only) */
export async function getUserDetail(userId) {
  return apiSuccessData(`/auth/users/${userId}`, { auth: true })
}

/** GET /auth/admin/dashboard (admin-only) */
export async function getAdminDashboard() {
  return apiSuccessData('/auth/admin/dashboard', { auth: true })
}

/** GET /auth/admins (super_admin-only) */
export async function listAdmins({ page = 1, pageSize = 20, search = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  if (search.trim()) params.set('search', search.trim())

  return apiSuccessData(`/auth/admins?${params}`, { auth: true })
}

/** GET /auth/admins/{userId} (super_admin-only) */
export async function getAdminDetail(userId) {
  return apiSuccessData(`/auth/admins/${userId}`, { auth: true })
}

/** DELETE /auth/admins/{userId} (super_admin-only) */
export async function deleteAdmin(userId) {
  return apiSuccessData(`/auth/admins/${userId}`, {
    method: 'DELETE',
    auth: true,
  })
}
