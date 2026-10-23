import { useCallback, useEffect, useState } from 'react'
import { getDidOnChainStatus, resolveDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  DidIdleState,
  DidSearchBar,
} from '@/components/admin/DidManagementPanel'
import {
  DidActiveDetails,
  DidActiveDetailsMobile,
  DidJsonModal,
  DidResolveError,
} from '@/components/admin/DidManagementViews'
import { isResolutionFound } from '@/utils/didFormat'

/**
 * Admin DID Management page.
 * Endpoints: GET /dids/{did}, GET /dids/on-chain/status
 */
export function AdminDidsPage() {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState('idle')
  const [resolution, setResolution] = useState(null)
  const [onChain, setOnChain] = useState(null)
  const [onChainMissing, setOnChainMissing] = useState(false)
  const [resolveError, setResolveError] = useState(null)
  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [jsonModalOpen, setJsonModalOpen] = useState(false)
  const [chainError, setChainError] = useState(null)

  const resolvedDid = resolution?.didDocument?.id || query.trim()

  useEffect(() => {
    document.title = 'FUM Wallet - DID Management'
  }, [])

  const fetchOnChainStatus = useCallback(async (did) => {
    try {
      const record = await getDidOnChainStatus(did)
      setOnChain(record)
      setOnChainMissing(false)
      return record
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setOnChain(null)
        setOnChainMissing(true)
        return null
      }
      throw err
    }
  }, [])

  function handleQueryChange(value) {
    setQuery(value)
  }

  async function handleResolve(event) {
    event?.preventDefault?.()
    const did = query.trim()
    if (!did) return

    setPhase('loading')
    setResolveError(null)
    setChainError(null)
    setJsonExpanded(false)
    setOnChain(null)
    setOnChainMissing(false)

    try {
      const result = await resolveDid(did)

      if (!isResolutionFound(result)) {
        setPhase('error')
        setResolution(null)
        setResolveError(result?.didResolutionMetadata?.error || 'DID could not be resolved.')
        return
      }

      setResolution(result)
      setPhase('resolved')

      try {
        await fetchOnChainStatus(did)
      } catch (chainErr) {
        setOnChain(null)
        setOnChainMissing(false)
        if (chainErr instanceof ApiError) {
          setChainError(chainErr.message)
        }
      }
    } catch (err) {
      setPhase('error')
      setResolution(null)
      setResolveError(err instanceof ApiError ? err.message : 'Failed to resolve DID.')
    }
  }

  function handleRetry() {
    setPhase('idle')
    setResolveError(null)
  }

  const showIdle = phase === 'idle'
  const showLoading = phase === 'loading'
  const showError = phase === 'error'
  const showResolved = phase === 'resolved' && resolution

  return (
    <div className="did-mgmt">
      {showIdle && (
        <header className="did-mgmt__page-header">
          <h1>DID Management</h1>
          <p>Search a DID to inspect its document and on-chain registry status.</p>
        </header>
      )}

      {(showIdle || showLoading || showError) && (
        <>
          <DidSearchBar
            value={query}
            onChange={handleQueryChange}
            onSubmit={handleResolve}
            loading={showLoading}
          />
          {showIdle && <DidIdleState />}
          {showLoading && (
            <section className="did-mgmt__loading">
              <div className="state-panel__spinner" aria-hidden="true" />
              <p>Resolving DID…</p>
            </section>
          )}
          {showError && (
            <DidResolveError message={resolveError} onRetry={handleRetry} />
          )}
        </>
      )}

      {showResolved && (
        <>
          <DidSearchBar
            value={query}
            onChange={handleQueryChange}
            onSubmit={handleResolve}
            loading={showLoading}
            compact
          />

          <div className="did-mgmt__desktop-only">
            <DidActiveDetails
              did={resolvedDid}
              resolution={resolution}
              onChain={onChain}
              onChainMissing={onChainMissing}
              jsonExpanded={jsonExpanded}
              onToggleJson={() => setJsonExpanded((v) => !v)}
            />
          </div>
          <div className="did-mgmt__mobile-only">
            <DidActiveDetailsMobile
              did={resolvedDid}
              resolution={resolution}
              onChain={onChain}
              onChainMissing={onChainMissing}
              onViewJson={() => setJsonModalOpen(true)}
            />
          </div>

          {chainError && (
            <div className="did-mgmt__inline-error did-mgmt__inline-error--floating" role="alert">
              <span>{chainError}</span>
            </div>
          )}
        </>
      )}

      {jsonModalOpen && resolution && (
        <DidJsonModal resolution={resolution} onClose={() => setJsonModalOpen(false)} />
      )}
    </div>
  )
}
