import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingState title="Starting session" message="Checking authentication…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
