import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listCredentialsByUsername, revokeCredential } from '@/api/credentials'
import { ApiError } from '@/api/client'
import {
  CredentialJsonModal,
  CredentialsCards,
  CredentialsEmptyResults,
  CredentialsErrorState,
  CredentialsIdleState,
  CredentialsPagination,
  CredentialsTable,
  RevokeCredentialModal,
  RevokeSuccessBanner,
  UsernameLookupBar,
} from '@/components/admin/UserCredentialsPanel'

const PAGE_SIZE = 10

/**
 * Admin User Credentials page.
 * Endpoints: GET /credentials/users/{username}/credentials, POST /credentials/revoke
 */
export function AdminCredentialsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [loadedUsername, setLoadedUsername] = useState('')
  const [phase, setPhase] = useState('idle')
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [jsonModalItem, setJsonModalItem] = useState(null)
  const [revokingId, setRevokingId] = useState(null)
  const [revokeSuccessId, setRevokeSuccessId] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)

  useEffect(() => {
    document.title = 'FUM Wallet - User Credentials'
  }, [])

  const fetchCredentials = useCallback(async (lookupUsername, targetPage = 1) => {
    const trimmed = lookupUsername.trim()
    if (!trimmed) return

    setPhase('loading')
    setError(null)
    setExpandedId(null)

    try {
      const data = await listCredentialsByUsername(trimmed, targetPage, PAGE_SIZE)
      setItems(data.items || [])
      setPagination(data.pagination || null)
      setLoadedUsername(trimmed)
      setPage(targetPage)
      setPhase('loaded')
    } catch (err) {
      setItems([])
      setPagination(null)
      setPhase('error')
      if (err instanceof ApiError && err.status === 404) {
        setError('User not found or has no DID document.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load credentials.')
      }
    }
  }, [])

  useEffect(() => {
    const prefillUsername = location.state?.username
    if (typeof prefillUsername !== 'string' || !prefillUsername.trim()) return

    const trimmed = prefillUsername.trim()
    setUsername(trimmed)
    fetchCredentials(trimmed, 1)
    navigate('/admin/credentials', { replace: true, state: {} })
  }, [location.state, fetchCredentials, navigate])

  function handleSubmit(event) {
    event.preventDefault()
    fetchCredentials(username, 1)
  }

  function handleToggleJson(item) {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setJsonModalItem((current) => (current?.credential_id === item.credential_id ? null : item))
      return
    }
    setExpandedId((current) => (current === item.credential_id ? null : item.credential_id))
  }

  function handleRevokeRequest(item) {
    if (revokingId) return
    setRevokeTarget(item)
  }

  function handleRevokeCancel() {
    if (revokingId) return
    setRevokeTarget(null)
  }

  async function handleRevokeConfirm(reason) {
    if (!revokeTarget || revokingId) return

    setRevokingId(revokeTarget.credential_id)

    try {
      await revokeCredential(revokeTarget.credential_id, reason)
      setRevokeSuccessId(revokeTarget.credential_id)
      setRevokeTarget(null)
      await fetchCredentials(loadedUsername, page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke credential.')
      setPhase('loaded')
    } finally {
      setRevokingId(null)
    }
  }

  const showIdle = phase === 'idle'
  const showLoading = phase === 'loading'
  const showError = phase === 'error'
  const showLoaded = phase === 'loaded'

  return (
    <div className="user-creds">
      {revokeSuccessId && (
        <RevokeSuccessBanner
          credentialId={revokeSuccessId}
          onDismiss={() => setRevokeSuccessId(null)}
        />
      )}

      <header className="user-creds__page-header">
        <h1>User Credentials</h1>
        <p>Look up a user by username and manage their issued credentials.</p>
      </header>

      <UsernameLookupBar
        value={username}
        onChange={setUsername}
        onSubmit={handleSubmit}
        loading={showLoading}
        compact={showLoaded}
      />

      {showIdle && <CredentialsIdleState />}

      {showLoading && (
        <section className="user-creds__loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Loading credentials…</p>
        </section>
      )}

      {showError && (
        <CredentialsErrorState
          message={error}
          onRetry={() => {
            setPhase('idle')
            setError(null)
          }}
        />
      )}

      {showLoaded && (
        <>
          <div className="user-creds__results-header">
            <p>
              Showing credentials for <strong>{loadedUsername}</strong> ({pagination?.total_items ?? items.length}{' '}
              {pagination?.total_items === 1 ? 'item' : 'items'} found)
            </p>
          </div>

          {items.length === 0 ? (
            <CredentialsEmptyResults username={loadedUsername} />
          ) : (
            <>
              <CredentialsTable
                items={items}
                expandedId={expandedId}
                onToggleJson={handleToggleJson}
                onRevoke={handleRevokeRequest}
                revokingId={revokingId}
                showChainStatus
              />
              <CredentialsCards
                items={items}
                onRevoke={handleRevokeRequest}
                onViewJson={handleToggleJson}
                revokingId={revokingId}
                showChainStatus
              />
              <CredentialsPagination
                pagination={pagination}
                loading={showLoading}
                onPageChange={(nextPage) => fetchCredentials(loadedUsername, nextPage)}
              />
            </>
          )}
        </>
      )}

      {jsonModalItem && (
        <CredentialJsonModal item={jsonModalItem} onClose={() => setJsonModalItem(null)} />
      )}

      {revokeTarget && (
        <RevokeCredentialModal
          item={revokeTarget}
          loading={revokingId === revokeTarget.credential_id}
          onConfirm={handleRevokeConfirm}
          onCancel={handleRevokeCancel}
        />
      )}
    </div>
  )
}
