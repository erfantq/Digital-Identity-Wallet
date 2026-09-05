import { useCallback, useEffect, useState } from 'react'
import { deactivateDidOnChain, getDidOnChainStatus, resolveDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  DidIdleState,
  DidSearchBar,
} from '@/components/admin/DidManagementPanel'
import {
  DidActiveDetails,
  DidActiveDetailsMobile,
  DidDeactivatedDetails,
  DidJsonModal,
  DidResolveError,
  DidSuccessBanner,
} from '@/components/admin/DidManagementViews'
import { isResolutionFound } from '@/utils/didFormat'

/**
 * Admin DID Management page.
 * Endpoints: GET /dids/{did}, GET /dids/on-chain/status, POST /dids/on-chain/deactivate
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
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState(null)
  const [deactivateResult, setDeactivateResult] = useState(null)
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)

  const resolvedDid = resolution?.didDocument?.id || query.trim()

  const isDeactivated =
    Boolean(deactivateResult) ||
    resolution?.didDocumentMetadata?.deactivated === true ||
    (onChain != null && onChain.active === false)

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
    setDeactivateError(null)
    setDeactivateResult(null)
    setShowSuccessBanner(false)
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
          setDeactivateError(chainErr.message)
        }
      }
    } catch (err) {
      setPhase('error')
      setResolution(null)
      setResolveError(err instanceof ApiError ? err.message : 'Failed to resolve DID.')
    }
  }

  async function handleDeactivate() {
    const did = resolvedDid
    if (!did || deactivating) return

    setDeactivating(true)
    setDeactivateError(null)

    try {
      const result = await deactivateDidOnChain(did)
      setDeactivateResult(result)
      setShowSuccessBanner(true)

      const [freshResolution] = await Promise.all([
        resolveDid(did).catch(() => resolution),
        fetchOnChainStatus(did).catch(() => null),
      ])

      if (freshResolution && isResolutionFound(freshResolution)) {
        setResolution(freshResolution)
      }
    } catch (err) {
      setDeactivateError(err instanceof ApiError ? err.message : 'Failed to deactivate DID on-chain.')
    } finally {
      setDeactivating(false)
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

          {showSuccessBanner && deactivateResult && (
            <DidSuccessBanner
              txHash={deactivateResult.tx_hash}
              blockNumber={deactivateResult.block_number}
              onDismiss={() => setShowSuccessBanner(false)}
            />
          )}

          {isDeactivated ? (
            <DidDeactivatedDetails
              did={resolvedDid}
              resolution={resolution}
              onChain={onChain}
              deactivateError={deactivateError}
              onDismissError={() => setDeactivateError(null)}
            />
          ) : (
            <>
              <div className="did-mgmt__desktop-only">
                <DidActiveDetails
                  did={resolvedDid}
                  resolution={resolution}
                  onChain={onChain}
                  onChainMissing={onChainMissing}
                  jsonExpanded={jsonExpanded}
                  onToggleJson={() => setJsonExpanded((v) => !v)}
                  onDeactivate={handleDeactivate}
                  deactivating={deactivating}
                />
              </div>
              <div className="did-mgmt__mobile-only">
                <DidActiveDetailsMobile
                  did={resolvedDid}
                  resolution={resolution}
                  onChain={onChain}
                  onChainMissing={onChainMissing}
                  onDeactivate={handleDeactivate}
                  deactivating={deactivating}
                  onViewJson={() => setJsonModalOpen(true)}
                />
              </div>
            </>
          )}

          {deactivateError && !isDeactivated && (
            <div className="did-mgmt__inline-error did-mgmt__inline-error--floating" role="alert">
              <span>{deactivateError}</span>
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
