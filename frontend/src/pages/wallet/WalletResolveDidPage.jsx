import { useEffect, useMemo, useState } from 'react'
import { getDidOnChainStatus, resolveDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  CopyButton,
  DidMonoField,
  DidStatusBadge,
} from '@/components/admin/DidManagementPanel'
import { JsonDocumentCard } from '@/components/admin/DidManagementViews'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import {
  deriveDidHealth,
  extractVerificationMethod,
  formatRegisteredAt,
  formatUtcDate,
  getDidMethodLabel,
  isResolutionFound,
  truncateMiddle,
} from '@/utils/didFormat'
import { chainlensAddressUrl } from '@/utils/explorer'
import '@/styles/wallet-did.css'
import '@/styles/wallet-resolve-did.css'

const EXAMPLE_DIDS = [
  'did:ethr:0x3b0bc51ab9ce023631c75314a74fa2e13ebdd665',
  'did:ethr:0x1C7e13956dE0be618365E9229796c697638E4821',
]

function isValidDidInput(value) {
  const trimmed = value.trim()
  return trimmed.startsWith('did:') && trimmed.length > 8
}

/**
 * Wallet Resolve DID page.
 * Endpoints:
 * - GET /dids/{did}
 * - GET /dids/on-chain/status
 */
export function WalletResolveDidPage() {
  const [query, setQuery] = useState('')
  const [inputError, setInputError] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [resolution, setResolution] = useState(null)
  const [resolvedQuery, setResolvedQuery] = useState('')
  const [onChain, setOnChain] = useState(null)
  const [onChainMissing, setOnChainMissing] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [jsonExpanded, setJsonExpanded] = useState(false)

  useEffect(() => {
    window.document.title = 'FUM Wallet - Resolve DID'
  }, [])

  const didDocument = resolution?.didDocument
  const did = didDocument?.id || resolvedQuery || ''
  const meta = resolution?.didDocumentMetadata || {}
  const retrieved = resolution?.didResolutionMetadata?.retrieved
  const vm = extractVerificationMethod(didDocument)
  const controller = didDocument?.controller || did || '—'
  const health = useMemo(() => deriveDidHealth(resolution, onChain), [resolution, onChain])

  const ethAddress =
    onChain?.controller ||
    (typeof vm.blockchainAccountId === 'string'
      ? vm.blockchainAccountId.split(':').pop()
      : null) ||
    (did.startsWith('did:ethr:') ? did.slice('did:ethr:'.length) : null)

  const explorerUrl = chainlensAddressUrl(ethAddress)

  async function handleResolve(event) {
    event?.preventDefault?.()
    const trimmed = query.trim()

    if (!trimmed) {
      setInputError('Enter a DID string to resolve.')
      return
    }

    if (!isValidDidInput(trimmed)) {
      setInputError('DID must start with did: and include a method and identifier.')
      return
    }

    setInputError(null)
    setRequestError(null)
    setPhase('loading')
    setOnChain(null)
    setOnChainMissing(false)
    setJsonExpanded(false)

    try {
      const data = await resolveDid(trimmed)
      setResolvedQuery(trimmed)

      if (!isResolutionFound(data)) {
        setResolution(data)
        setOnChain(null)
        setOnChainMissing(false)
        setPhase('error')
        setRequestError(data?.didResolutionMetadata?.error || 'DID could not be resolved.')
        return
      }

      setResolution(data)
      setPhase('resolved')

      try {
        const status = await getDidOnChainStatus(trimmed)
        setOnChain(status)
        setOnChainMissing(false)
      } catch (err) {
        setOnChain(null)
        setOnChainMissing(err instanceof ApiError && (err.status === 404 || err.status === 503))
      }
    } catch (err) {
      setResolution(null)
      setResolvedQuery(trimmed)
      setOnChain(null)
      setOnChainMissing(false)
      setPhase('error')
      setRequestError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to resolve DID',
      )
    }
  }

  const showIdle = phase === 'idle'
  const showLoading = phase === 'loading'
  const showError = phase === 'error'
  const showResolved = phase === 'resolved' && resolution

  return (
    <div className="wallet-resolve wallet-did">
      <header className="wallet-did__page-header">
        <div>
          <h1>Resolve DID</h1>
          <p>Look up any Decentralized Identifier and inspect its document and registry status.</p>
        </div>
      </header>

      <section className="wallet-resolve__lookup">
        <form className="wallet-resolve__lookup-form" onSubmit={(e) => void handleResolve(e)}>
          <label className="wallet-resolve__label" htmlFor="resolve-did-input">
            Decentralized Identifier
          </label>
          <div className="wallet-resolve__lookup-row">
            <div className="wallet-resolve__input-wrap">
              <MaterialIcon name="search" size={20} className="wallet-resolve__input-icon" />
              <input
                id="resolve-did-input"
                className={`wallet-resolve__input${inputError ? ' wallet-resolve__input--invalid' : ''}`}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (inputError) setInputError(null)
                }}
                placeholder="did:ethr:0x..."
                autoComplete="off"
                spellCheck={false}
                disabled={showLoading}
              />
            </div>
            <button type="submit" className="wallet-resolve__resolve-btn" disabled={showLoading}>
              <MaterialIcon
                name={showLoading ? 'progress_activity' : 'manage_search'}
                size={18}
                className={showLoading ? 'wallet-resolve__spin' : undefined}
              />
              {showLoading ? 'Resolving…' : 'Resolve'}
            </button>
          </div>
        </form>

        {inputError && <p className="wallet-resolve__field-error">{inputError}</p>}
        <p className="wallet-resolve__hint">Example: did:ethr:0x1C7e13956dE0be618365E9229796c697638E4821</p>
      </section>

      {showIdle && (
        <section className="wallet-did__empty">
          <div className="wallet-did__empty-icon">
            <MaterialIcon name="travel_explore" size={40} />
          </div>
          <h2>Ready to resolve</h2>
          <p>
            Enter a DID string above to retrieve its DID Document, verification methods, and
            on-chain registry status.
          </p>
          <div className="wallet-resolve__examples">
            <span className="wallet-resolve__examples-label">Try an example:</span>
            {EXAMPLE_DIDS.map((example) => (
              <button
                key={example}
                type="button"
                className="wallet-resolve__example-btn"
                onClick={() => {
                  setQuery(example)
                  setInputError(null)
                }}
              >
                {truncateMiddle(example, 18, 6)}
              </button>
            ))}
          </div>
        </section>
      )}

      {showLoading && (
        <section className="wallet-did__loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Resolving DID…</p>
        </section>
      )}

      {showError && (
        <section className="wallet-did__empty wallet-did__empty--error">
          <MaterialIcon name="error" size={40} filled />
          <h2>Unable to resolve DID</h2>
          <p>{requestError}</p>
          {resolvedQuery && (
            <p className="wallet-resolve__error-did">
              Queried: <code>{resolvedQuery}</code>
            </p>
          )}
          <button
            type="button"
            className="wallet-did__btn wallet-did__btn--secondary"
            onClick={() => void handleResolve()}
          >
            Try again
          </button>
        </section>
      )}

      {showResolved && (
        <>
          {health.alert && (
            <div className={`wallet-did__alert wallet-did__alert--${health.alertTone}`} role="status">
              <MaterialIcon
                name={health.key === 'deactivated' ? 'cancel' : 'warning'}
                size={20}
                filled
              />
              <p>{health.alert}</p>
            </div>
          )}

          <div className="wallet-did__layout">
            <div className="wallet-did__main">
              <section className="wallet-did__card">
                <div className="wallet-did__card-badges">
                  <DidStatusBadge kind={health.badgeKind} label={health.label} icon={health.icon} />
                  <DidStatusBadge kind="neutral" label={getDidMethodLabel(did)} />
                </div>
                <span className="wallet-did__eyebrow">Resolved Identifier</span>
                <div className="wallet-did__did-row">
                  <span className="wallet-did__did-value" title={did}>
                    {did}
                  </span>
                  <CopyButton value={did} label="Copy DID" />
                </div>
              </section>

              <section className="wallet-did__card">
                <h2 className="wallet-did__card-title">Record Details</h2>
                <dl className="wallet-did__record-grid">
                  <div>
                    <dt>Controller</dt>
                    <dd title={controller}>{truncateMiddle(controller, 22, 10)}</dd>
                  </div>
                  <div>
                    <dt>Method Type</dt>
                    <dd>{vm.type}</dd>
                  </div>
                  <div>
                    <dt>Blockchain Account</dt>
                    <dd className="wallet-did__mono" title={vm.blockchainAccountId || undefined}>
                      {vm.blockchainAccountId
                        ? truncateMiddle(vm.blockchainAccountId, 18, 10)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatUtcDate(meta.created)}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatUtcDate(meta.updated)}</dd>
                  </div>
                  <div>
                    <dt>Last Retrieved</dt>
                    <dd>{retrieved ? formatUtcDate(retrieved) : 'Just now'}</dd>
                  </div>
                </dl>
              </section>

              <JsonDocumentCard
                resolution={resolution}
                expanded={jsonExpanded}
                onToggle={() => setJsonExpanded((open) => !open)}
              />
            </div>

            <aside className="wallet-did__side">
              <section className="wallet-did__card wallet-did__card--sticky">
                <div className="wallet-did__onchain-header">
                  <h2>On-chain Status</h2>
                  {onChainMissing ? (
                    <DidStatusBadge kind="pending" label="Not anchored" icon="hourglass_empty" />
                  ) : !onChain ? (
                    <DidStatusBadge kind="pending" label="Unavailable" icon="hourglass_empty" />
                  ) : onChain.active ? (
                    <DidStatusBadge kind="active" label="Active" icon="link" />
                  ) : (
                    <DidStatusBadge kind="inactive" label="Inactive" icon="block" />
                  )}
                </div>

                {onChainMissing ? (
                  <p className="wallet-did__onchain-empty">
                    This DID has not been registered on the Ethereum registry yet, or the registry
                    is unreachable.
                  </p>
                ) : !onChain ? (
                  <p className="wallet-did__onchain-empty">On-chain status could not be loaded.</p>
                ) : (
                  <div className="wallet-did__onchain-fields">
                    <DidMonoField label="DID Hash" value={onChain.did_hash} copyable truncate />
                    <DidMonoField
                      label="Controller Address"
                      value={onChain.controller}
                      copyable
                      truncate
                    />
                    <DidMonoField
                      label="Document Hash"
                      value={onChain.document_hash}
                      copyable
                      truncate
                    />
                    <div className="wallet-did__field-block">
                      <span className="wallet-did__field-label">
                        <MaterialIcon name="history" size={16} /> Registered At
                      </span>
                      <span className="wallet-did__field-value">
                        {formatRegisteredAt(onChain.registered_at)}
                      </span>
                    </div>
                  </div>
                )}

                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-did__explorer-link"
                  >
                    <MaterialIcon name="open_in_new" size={18} />
                    View address in explorer
                  </a>
                )}

                <p className="wallet-did__side-note">
                  This is a public resolve view. Deactivation is only available to administrators.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
