import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getDefaultRouteForRole } from '@/utils/roles'

export function RoleRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />
  }

  return <Outlet />
}
