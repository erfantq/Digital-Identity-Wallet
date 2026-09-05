import { useCallback, useEffect, useState } from 'react'
import { getAdminDashboard } from '@/api/auth'
import { ApiError } from '@/api/client'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import '@/styles/admin-dashboard.css'

export function AdminHomePage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const stats = await getAdminDashboard()
      setData(stats)
    } catch (err) {
      setData(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'FUM Wallet - Admin Dashboard'
    loadDashboard()
  }, [loadDashboard])

  if (loading && !data) {
    return (
      <div className="admin-dash admin-dash--center">
        <MaterialIcon name="progress_activity" size={36} className="admin-dash__spinner" />
        <p>Loading dashboard…</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="admin-dash admin-dash--center admin-dash--error">
        <MaterialIcon name="error" size={40} filled />
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button type="button" className="admin-dash__refresh" onClick={loadDashboard}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <AdminDashboard
      data={data}
      username={user?.username}
      onRefresh={loadDashboard}
      loading={loading}
    />
  )
}
