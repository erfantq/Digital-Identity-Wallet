import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAuthUserCredentials } from '@/api/credentials'
import { getDidOnChainStatus, resolveMyDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  WalletOverviewDashboard,
  buildWalletOverviewSummary,
  deriveDidState,
} from '@/components/wallet/WalletOverviewDashboard'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import '@/styles/admin-dashboard.css'
import '@/styles/wallet-overview.css'

/**
 * Wallet overview page.
 * Endpoints:
 * - GET /dids/me
 * - GET /dids/on-chain/status
 * - GET /credentials/users/auth/credentials
 */
export function WalletHomePage() {
  const { user } = useAuth()
  const [resolution, setResolution] = useState(null)
  const [onChainStatus, setOnChainStatus] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [didMissing, setDidMissing] = useState(false)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)

    let nextResolution = null
    let nextOnChain = null
    let nextCredentials = []
    let missingDid = false

    try {
      try {
        nextResolution = await resolveMyDid()
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          missingDid = true
        } else {
          throw err
        }
      }

      const did = nextResolution?.didDocument?.id
      if (did) {
        try {
          nextOnChain = await getDidOnChainStatus(did)
        } catch {
          nextOnChain = null
        }

        try {
          const credData = await listAuthUserCredentials(1, 100)
          nextCredentials = credData.items || []
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err
          }
        }
      }

      setResolution(nextResolution)
      setOnChainStatus(nextOnChain)
      setCredentials(nextCredentials)
      setDidMissing(missingDid)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load wallet overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'FUM Wallet - Overview'
    loadOverview()
  }, [loadOverview])

  const overview = useMemo(
    () => buildWalletOverviewSummary(credentials),
    [credentials],
  )

  const didState = useMemo(() => {
    if (didMissing) {
      return {
        status: 'missing',
        did: null,
        message: null,
        onChainRegistered: null,
      }
    }
    return deriveDidState(resolution, onChainStatus)
  }, [didMissing, resolution, onChainStatus])

  if (loading && !resolution && credentials.length === 0 && !didMissing && !error) {
    return (
      <div className="admin-dash admin-dash--center">
        <MaterialIcon name="progress_activity" size={36} className="admin-dash__spinner" />
        <p>Loading overview…</p>
      </div>
    )
  }

  if (error && !resolution && credentials.length === 0 && !didMissing) {
    return (
      <div className="admin-dash admin-dash--center admin-dash--error">
        <MaterialIcon name="error" size={40} filled />
        <h2>Unable to load overview</h2>
        <p>{error}</p>
        <button type="button" className="admin-dash__refresh" onClick={loadOverview}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <WalletOverviewDashboard
      user={user}
      summary={overview.summary}
      credentialsByType={overview.credentialsByType}
      recentCredentials={overview.recentCredentials}
      didState={didState}
      onRefresh={loadOverview}
      loading={loading}
    />
  )
}
