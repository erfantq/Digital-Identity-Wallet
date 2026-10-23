import { MaterialIcon } from '@/components/landing/MaterialIcon'
import {
  CopyButton,
  DidMonoField,
  DidStatusBadge,
} from '@/components/admin/DidManagementPanel'
import {
  buildDidDocumentForDisplay,
  extractVerificationMethod,
  formatRegisteredAt,
  formatUtcDate,
  getDidMethodLabel,
  truncateMiddle,
} from '@/utils/didFormat'
import { chainlensAddressUrl } from '@/utils/explorer'

function resolveExplorerAddress(did, onChain, didDocument) {
  const vm = extractVerificationMethod(didDocument)
  const fromVm =
    typeof vm.blockchainAccountId === 'string'
      ? vm.blockchainAccountId.split(':').pop()
      : null
  const fromDid = did?.startsWith('did:ethr:') ? did.slice('did:ethr:'.length) : null
  return onChain?.controller || fromVm || fromDid || null
}

function ExplorerAddressLink({ address }) {
  const url = chainlensAddressUrl(address)
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="did-mgmt__explorer-link"
    >
      <MaterialIcon name="open_in_new" size={18} />
      View address in explorer
    </a>
  )
}

export function DidResolveError({ message, onRetry }) {
  return (
    <section className="did-mgmt__error">
      <MaterialIcon name="error" size={40} className="did-mgmt__error-icon" />
      <h3>Unable to resolve DID</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="did-mgmt__btn did-mgmt__btn--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

export function JsonDocumentCard({ resolution, expanded, onToggle }) {
  const doc = buildDidDocumentForDisplay(resolution)
  const json = doc ? JSON.stringify(doc, null, 2) : '{}'

  return (
    <div className="did-mgmt__json-card">
      <button type="button" className="did-mgmt__json-header" onClick={onToggle} aria-expanded={expanded}>
        <h3>DID Document JSON</h3>
        <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} size={24} />
      </button>
      {expanded && (
        <div className="did-mgmt__json-body">
          <pre>{json}</pre>
        </div>
      )}
    </div>
  )
}

export function DidActiveDetails({
  did,
  resolution,
  onChain,
  onChainMissing,
  jsonExpanded,
  onToggleJson,
}) {
  const doc = resolution?.didDocument
  const meta = resolution?.didDocumentMetadata || {}
  const retrieved = resolution.didResolutionMetadata?.retrieved
  const vm = extractVerificationMethod(doc)
  const controller = doc.controller || doc.id
  const explorerAddress = resolveExplorerAddress(did, onChain, doc)

  return (
    <div className="did-mgmt__details">
      <div className="did-mgmt__details-header did-mgmt__details-header--active">
        <div>
          <h2>DID Details</h2>
          <p>Viewing resolved decentralized identifier information and on-chain status.</p>
        </div>
      </div>

      <div className="did-mgmt__bento">
        <div className="did-mgmt__bento-main">
          <article className="did-mgmt__card">
            <div className="did-mgmt__card-badges">
              <DidStatusBadge kind="healthy" label="Healthy" icon="check_circle" />
              <DidStatusBadge kind="neutral" label={getDidMethodLabel(did)} />
            </div>
            <span className="did-mgmt__card-eyebrow">Decentralized Identifier</span>
            <div className="did-mgmt__did-row">
              <span className="did-mgmt__did-value">{did}</span>
              <CopyButton value={did} label="Copy DID" />
            </div>
          </article>

          <article className="did-mgmt__card">
            <h3 className="did-mgmt__card-title">Record Details</h3>
            <dl className="did-mgmt__record-grid">
              <div>
                <dt>Controller</dt>
                <dd>{controller}</dd>
              </div>
              <div>
                <dt>Method Type</dt>
                <dd>{vm.type}</dd>
              </div>
              <div>
                <dt>Blockchain Account</dt>
                <dd className="did-mgmt__mono">{vm.blockchainAccountId || '—'}</dd>
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
          </article>

          <JsonDocumentCard resolution={resolution} expanded={jsonExpanded} onToggle={onToggleJson} />
        </div>

        <aside className="did-mgmt__bento-side">
          <article className="did-mgmt__card did-mgmt__card--sticky">
            <div className="did-mgmt__onchain-header">
              <h3>On-chain Status</h3>
              {onChainMissing ? (
                <DidStatusBadge kind="pending" label="Not anchored" icon="hourglass_empty" />
              ) : !onChain ? (
                <DidStatusBadge kind="pending" label="Loading" icon="hourglass_empty" />
              ) : onChain.active === false ? (
                <DidStatusBadge kind="inactive" label="Inactive" icon="block" />
              ) : (
                <DidStatusBadge kind="active" label="Active" icon="link" />
              )}
            </div>

            {onChainMissing ? (
              <p className="did-mgmt__onchain-empty">
                This DID has not been registered on the Ethereum registry yet.
              </p>
            ) : !onChain ? (
              <p className="did-mgmt__onchain-empty">Loading on-chain status…</p>
            ) : (
              <div className="did-mgmt__onchain-fields">
                <DidMonoField label="DID Hash" value={onChain.did_hash} copyable truncate />
                <DidMonoField label="Controller Address" value={onChain.controller} copyable truncate />
                <DidMonoField label="Document Hash" value={onChain.document_hash} copyable truncate />
                <div className="did-mgmt__field-block">
                  <span className="did-mgmt__field-label">
                    <MaterialIcon name="history" size={16} /> Registered At
                  </span>
                  <span className="did-mgmt__field-value">{formatRegisteredAt(onChain.registered_at)}</span>
                </div>
              </div>
            )}

            <ExplorerAddressLink address={explorerAddress} />
          </article>
        </aside>
      </div>
    </div>
  )
}

/** Mobile stacked cards for active resolved state */
export function DidActiveDetailsMobile({
  did,
  resolution,
  onChain,
  onChainMissing,
  onViewJson,
}) {
  const doc = resolution?.didDocument
  const meta = resolution?.didDocumentMetadata || {}
  const explorerAddress = resolveExplorerAddress(did, onChain, doc)

  return (
    <div className="did-mgmt__mobile-details">
      <div className="did-mgmt__mobile-header">
        <h2>DID Management</h2>
        <p>Manage and monitor decentralized identifiers.</p>
      </div>

      <article className="did-mgmt__card">
        <header className="did-mgmt__mobile-card-header">
          <h3>
            <MaterialIcon name="data_object" size={22} />
            Resolved DID
          </h3>
          <DidStatusBadge kind="healthy" label="Healthy" icon="check_circle" />
        </header>
        <div className="did-mgmt__mobile-fields">
          <div className="did-mgmt__mobile-field">
            <label>DID String</label>
            <div className="did-mgmt__mono-value did-mgmt__mono-value--break">{did}</div>
          </div>
          <div className="did-mgmt__mobile-field-grid">
            <div className="did-mgmt__mobile-field">
              <label>Controller</label>
              <div>{doc.controller || 'Self-Managed'}</div>
            </div>
            <div className="did-mgmt__mobile-field">
              <label>Created</label>
              <div>{formatUtcDate(meta.created)}</div>
            </div>
          </div>
        </div>
      </article>

      <article className="did-mgmt__card">
        <header className="did-mgmt__mobile-card-header">
          <h3>
            <MaterialIcon name="link" size={22} />
            On-chain Status
          </h3>
          {onChainMissing ? (
            <DidStatusBadge kind="pending" label="Not anchored" icon="hourglass_empty" />
          ) : onChain?.active === false ? (
            <DidStatusBadge kind="inactive" label="Inactive" icon="block" />
          ) : (
            <DidStatusBadge kind="active" label="Active" icon="trip_origin" />
          )}
        </header>
        {!onChainMissing && onChain && (
          <div className="did-mgmt__mobile-fields">
            <div className="did-mgmt__mobile-field">
              <label>Controller Address</label>
              <div className="did-mgmt__mono-value">{truncateMiddle(onChain.controller, 8, 6)}</div>
            </div>
            <div className="did-mgmt__mobile-field">
              <label>Document Hash</label>
              <div className="did-mgmt__mono-value">{truncateMiddle(onChain.document_hash, 8, 6)}</div>
            </div>
          </div>
        )}
        <ExplorerAddressLink address={explorerAddress} />
      </article>

      <button type="button" className="did-mgmt__btn did-mgmt__btn--primary did-mgmt__btn--block" onClick={onViewJson}>
        <MaterialIcon name="code" size={20} />
        View Raw DID Document
      </button>
    </div>
  )
}

export function DidJsonModal({ resolution, onClose }) {
  const doc = buildDidDocumentForDisplay(resolution)
  const json = doc ? JSON.stringify(doc, null, 2) : '{}'

  return (
    <div className="did-mgmt__modal-overlay" role="dialog" aria-modal="true" aria-label="DID Document JSON">
      <div className="did-mgmt__modal">
        <div className="did-mgmt__modal-header">
          <h3>DID Document JSON</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="did-mgmt__modal-body">
          <pre>{json}</pre>
        </div>
      </div>
    </div>
  )
}
