import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDidOnChainStatus, resolveMyDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  CopyButton,
  DidMonoField,
  DidStatusBadge,
} from '@/components/admin/DidManagementPanel'
import { JsonDocumentCard } from '@/components/admin/DidManagementViews'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import {
  deriveDidHealth,
  extractVerificationMethod,
  formatRegisteredAt,
  formatUtcDate,
  getDidMethodLabel,
  truncateMiddle,
} from '@/utils/didFormat'
import { chainlensAddressUrl } from '@/utils/explorer'
import '@/styles/wallet-did.css'

/**
 * Wallet My DID page.
 * Endpoints:
 * - GET /dids/me
 * - GET /dids/on-chain/status
 */
export function WalletDidPage() {
  const { user } = useAuth()
  const [resolution, setResolution] = useState(null)
  const [onChain, setOnChain] = useState(null)
  const [onChainMissing, setOnChainMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [jsonExpanded, setJsonExpanded] = useState(false)

  useEffect(() => {
    window.document.title = 'FUM Wallet - My DID'
  }, [])

  const loadDid = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true)
    else setLoading(true)

    setError(null)
    setNotFound(false)

    try {
      const data = await resolveMyDid()
      setResolution(data)

      const did = data?.didDocument?.id
      if (did) {
        try {
          const status = await getDidOnChainStatus(did)
          setOnChain(status)
          setOnChainMissing(false)
        } catch (err) {
          setOnChain(null)
          setOnChainMissing(err instanceof ApiError && (err.status === 404 || err.status === 503))
        }
      } else {
        setOnChain(null)
        setOnChainMissing(true)
      }
    } catch (err) {
      setResolution(null)
      setOnChain(null)
      setOnChainMissing(false)
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load DID',
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDid()
  }, [loadDid])

  const didDocument = resolution?.didDocument
  const did = didDocument?.id ?? ''
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

  if (loading) {
    return (
      <div className="wallet-did">
        <section className="wallet-did__loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Loading your DID…</p>
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="wallet-did">
        <header className="wallet-did__page-header wallet-creds__header">
          <div>
            <h1>My DID</h1>
            <p>Your decentralized identifier and on-chain registry record.</p>
          </div>
        </header>
        <section className="wallet-did__empty">
          <div className="wallet-did__empty-icon">
            <MaterialIcon name="fingerprint" size={40} />
          </div>
          <h2>No DID yet</h2>
          <p>
            No DID document is linked to
            {user?.username ? (
              <>
                {' '}
                <strong>{user.username}</strong>
              </>
            ) : (
              ' your account'
            )}
            . Ask an administrator to register your identity.
          </p>
          <button
            type="button"
            className="wallet-did__btn wallet-did__btn--secondary"
            onClick={() => void loadDid()}
          >
            <MaterialIcon name="refresh" size={18} />
            Refresh
          </button>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="wallet-did">
        <section className="wallet-did__empty wallet-did__empty--error">
          <MaterialIcon name="error" size={40} filled />
          <h2>Could not load DID</h2>
          <p>{error}</p>
          <button
            type="button"
            className="wallet-did__btn wallet-did__btn--secondary"
            onClick={() => void loadDid()}
          >
            Try again
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="wallet-did">
      <header className="wallet-did__page-header wallet-creds__header">
        <div>
          <h1>My DID</h1>
          <p>Review your Decentralized Identifier, verification methods, and registry status.</p>
        </div>
        <button
          type="button"
          className="user-creds__page-btn wallet-creds__refresh"
          disabled={refreshing}
          onClick={() => void loadDid({ soft: true })}
        >
          <MaterialIcon name="refresh" size={18} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

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
            <span className="wallet-did__eyebrow">Decentralized Identifier</span>
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
                This DID has not been registered on the Ethereum registry yet, or the registry is
                unreachable.
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
              Identity registration and deactivation are managed by university administrators.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
