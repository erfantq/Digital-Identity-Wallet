import { isSuperAdmin } from '@/utils/roles'

export const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/users', label: 'Register User', icon: 'person_add' },
  { to: '/admin/directory', label: 'All Users', icon: 'groups' },
  { to: '/admin/dids', label: 'DID Management', icon: 'fingerprint' },
  { to: '/admin/issue', label: 'Issue Credential', icon: 'verified_user' },
  { to: '/admin/credentials', label: 'User Credentials', icon: 'badge' },
  { to: '/admin/verify', label: 'Verify Credential', icon: 'verified' },
]

export const SUPER_ADMIN_EXTRA_NAV = [
  { to: '/admin/admins', label: 'Admin Management', icon: 'admin_panel_settings' },
]

/** @deprecated Prefer getRegisterRoleOptions(currentRole) from utils/roles */
export const REGISTER_ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
]

export const DIRECTORY_ROLE_FILTER_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
]

export function getAdminNavItems(role) {
  if (isSuperAdmin(role)) {
    return [...ADMIN_NAV_ITEMS, ...SUPER_ADMIN_EXTRA_NAV]
  }
  return ADMIN_NAV_ITEMS
}
