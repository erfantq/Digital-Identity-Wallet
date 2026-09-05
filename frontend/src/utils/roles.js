export const WALLET_ROLES = ['user', 'student', 'teacher']
export const ADMIN_PORTAL_ROLES = ['admin', 'super_admin']

export function isAdmin(role) {
  return role === 'admin'
}

export function isSuperAdmin(role) {
  return role === 'super_admin'
}

export function isAdminPortalRole(role) {
  return ADMIN_PORTAL_ROLES.includes(role)
}

export function isWalletRole(role) {
  return WALLET_ROLES.includes(role)
}

export function getDefaultRouteForRole(role) {
  if (isAdminPortalRole(role)) return '/admin'
  return '/wallet'
}

export function formatRoleLabel(role) {
  switch (role) {
    case 'super_admin':
      return 'Super Administrator'
    case 'admin':
      return 'Administrator'
    case 'student':
      return 'Student'
    case 'teacher':
      return 'Teacher'
    default:
      return 'User'
  }
}

export function getRegisterRoleOptions(currentRole) {
  const base = [
    { value: 'user', label: 'User' },
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
  ]

  if (isSuperAdmin(currentRole)) {
    return [...base, { value: 'admin', label: 'Admin' }]
  }

  return base
}
