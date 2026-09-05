import { Fragment, useState } from 'react'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import {
  formatCredentialDate,
  getCredentialIpfsLinks,
  getIssuanceDate,
  getSbtImageUrl,
  isActiveCredential,
  isRevokedCredential,
  statusLabel,
  truncateMiddle,
} from '@/utils/credentialFormat'

export function RevokeSuccessBanner({ credentialId, onDismiss }) {
  return (
    <div className="user-creds__success-banner" role="status">
      <MaterialIcon name="check_circle" size={24} filled className="user-creds__success-icon" />
      <div className="user-creds__success-body">
        <p className="user-creds__success-title">
          Credential {truncateMiddle(credentialId, 12, 8)} revoked successfully.
        </p>
        <p className="user-creds__success-note">
          Note: On-chain revocation may continue asynchronously in the background.
        </p>
      </div>
      <button type="button" className="user-creds__success-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <MaterialIcon name="close" size={20} />
      </button>
    </div>
  )
}

export function UsernameLookupBar({ value, onChange, onSubmit, loading, compact = false }) {
  return (
    <section className={`user-creds__lookup${compact ? ' user-creds__lookup--compact' : ''}`}>
      <label className="user-creds__lookup-label" htmlFor="username-lookup">
        Username
      </label>
      <form className="user-creds__lookup-form" onSubmit={onSubmit}>
        <div className="user-creds__lookup-input-wrap">
          <MaterialIcon name="search" size={20} className="user-creds__lookup-icon" />
          <input
            id="username-lookup"
            type="text"
            className="user-creds__lookup-input"
            placeholder="Enter username (e.g. j.doe)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" className="user-creds__lookup-submit" disabled={loading || !value.trim()}>
          <MaterialIcon name="download" size={20} />
          {loading ? 'Loading…' : 'Load Credentials'}
        </button>
      </form>
    </section>
  )
}

export function CredentialsIdleState() {
  return (
    <section className="user-creds__idle">
      <div className="user-creds__idle-icon-wrap">
        <MaterialIcon name="manage_search" size={48} />
      </div>
      <h3>Ready to Search</h3>
      <p>Enter a username above to retrieve and manage their digital credentials.</p>
    </section>
  )
}

function StatusBadge({ item }) {
  const revoked = isRevokedCredential(item)
  const active = isActiveCredential(item)

  let kind = 'neutral'
  if (active) kind = 'active'
  else if (revoked) kind = 'revoked'

  return (
    <div className="user-creds__status-wrap">
      <span className={`user-creds__badge user-creds__badge--${kind}`}>
        {active && <MaterialIcon name="check_circle" size={14} />}
        {revoked && <MaterialIcon name="block" size={14} />}
        {statusLabel(item.status)}
      </span>
      {revoked && item.revoked_at && (
        <span className="user-creds__revoked-date">{formatCredentialDate(item.revoked_at)}</span>
      )}
    </div>
  )
}

function CredentialIpfsLinks({ item }) {
  const links = getCredentialIpfsLinks(item)
  if (!links.metadata && !links.sbtImage) return null

  return (
    <div className="user-creds__ipfs-links">
      {links.sbtImage && (
        <a
          href={links.sbtImage.url}
          target="_blank"
          rel="noopener noreferrer"
          className="user-creds__ipfs-link user-creds__ipfs-link--image"
        >
          <MaterialIcon name="image" size={14} />
          SBT Image
        </a>
      )}
      {links.metadata && (
        <a
          href={links.metadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="user-creds__ipfs-link"
        >
          <MaterialIcon name="data_object" size={14} />
          Metadata
        </a>
      )}
    </div>
  )
}

function CredentialActions({
  item,
  onRevoke,
  onViewJson,
  revokingId,
  allowRevoke = true,
  onCheckChain,
  chainLoadingId,
}) {
  const active = isActiveCredential(item)
  const revoking = revokingId === item.credential_id
  const checking = chainLoadingId === item.credential_id
  const sbtImageUrl = getSbtImageUrl(item)

  return (
    <div className="user-creds__actions">
      {allowRevoke && active && (
        <button
          type="button"
          className="user-creds__action user-creds__action--revoke"
          onClick={() => onRevoke(item)}
          disabled={Boolean(revokingId)}
        >
          <MaterialIcon name="cancel" size={16} />
          {revoking ? 'Revoking…' : 'Revoke'}
        </button>
      )}
      {sbtImageUrl && (
        <a
          href={sbtImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="user-creds__action user-creds__action--image"
        >
          <MaterialIcon name="photo" size={16} />
          View SBT Image
        </a>
      )}
      {onCheckChain && (
        <button
          type="button"
          className="user-creds__action user-creds__action--json"
          onClick={() => onCheckChain(item)}
          disabled={checking}
        >
          <MaterialIcon name="hub" size={16} />
          {checking ? 'Checking…' : 'Chain status'}
        </button>
      )}
      <button type="button" className="user-creds__action user-creds__action--json" onClick={() => onViewJson(item)}>
        <MaterialIcon name="code" size={16} />
        View JSON
      </button>
    </div>
  )
}

function ChainStatusPills({ item, chainInfo }) {
  const registryKnown = chainInfo?.registryRegistered
  const sbtKnown = chainInfo?.sbtMinted
  const chainStatus = deriveLocalChainStatus(item, registryKnown, sbtKnown)

  return (
    <div className="user-creds__chain-pills">
      <span className={`user-creds__chain-pill user-creds__chain-pill--${chainStatus.registry}`}>
        Registry: {chainStatus.registryLabel}
      </span>
      <span className={`user-creds__chain-pill user-creds__chain-pill--${chainStatus.sbt}`}>
        SBT: {chainStatus.sbtLabel}
      </span>
    </div>
  )
}

function deriveLocalChainStatus(item, registryRegistered, sbtMinted) {
  const revoked = isRevokedCredential(item)
  const hasTx = Boolean(item.tx_hash) || registryRegistered === true
  const hasSbt = item.sbt_token_id != null || sbtMinted === true

  if (revoked) {
    return {
      registry: item.revoke_tx_hash || hasTx ? 'revoked' : 'pending',
      registryLabel: item.revoke_tx_hash || hasTx ? 'Revoked' : 'Local only',
      sbt: item.sbt_revoke_tx_hash || hasSbt ? 'revoked' : 'none',
      sbtLabel: item.sbt_revoke_tx_hash ? 'Revoked' : hasSbt ? 'Was minted' : 'None',
    }
  }

  return {
    registry: hasTx ? 'ok' : 'pending',
    registryLabel: hasTx ? 'Anchored' : 'Pending',
    sbt: hasSbt ? 'ok' : 'pending',
    sbtLabel: hasSbt ? 'Minted' : 'Pending',
  }
}

function CredentialJsonRow({ item, expanded, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!expanded) return null

  const json = JSON.stringify(item.credential, null, 2)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <tr className="user-creds__json-row">
      <td colSpan={4}>
        <div className="user-creds__json-panel">
          <div className="user-creds__json-panel-header">
            <h4>Signed Credential Data</h4>
            <button type="button" onClick={onClose} aria-label="Close JSON panel">
              <MaterialIcon name="close" size={20} />
            </button>
          </div>
          <pre>{json}</pre>
          <div className="user-creds__json-panel-footer">
            <button type="button" className="user-creds__page-btn" onClick={handleCopy}>
              <MaterialIcon name={copied ? 'check' : 'content_copy'} size={18} />
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

export function CredentialsTable({
  items,
  expandedId,
  onToggleJson,
  onRevoke,
  revokingId,
  allowRevoke = true,
  onCheckChain,
  chainLoadingId,
  chainInfoById = {},
  showChainStatus = false,
}) {
  return (
    <div className="user-creds__table-wrap user-creds__desktop-only">
      <table className="user-creds__table">
        <thead>
          <tr>
            <th>Credential Type / ID</th>
            <th>Status</th>
            <th>Issuer / Holder DID</th>
            <th className="user-creds__th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Fragment key={item.credential_id}>
              <tr className={isRevokedCredential(item) ? 'user-creds__row--revoked' : ''}>
                <td>
                  <div className="user-creds__type">{item.type}</div>
                  <div className="user-creds__credential-id">{truncateMiddle(item.credential_id, 14, 10)}</div>
                  <div className="user-creds__issued-date">
                    Issued {formatCredentialDate(getIssuanceDate(item))}
                  </div>
                  <CredentialIpfsLinks item={item} />
                  {showChainStatus && (
                    <ChainStatusPills item={item} chainInfo={chainInfoById[item.credential_id]} />
                  )}
                </td>
                <td>
                  <StatusBadge item={item} />
                </td>
                <td>
                  <div className="user-creds__did-line">
                    <span className="user-creds__did-label">Issuer:</span>
                    <code>{truncateMiddle(item.issuer, 12, 8)}</code>
                  </div>
                  <div className="user-creds__did-line">
                    <span className="user-creds__did-label">Holder:</span>
                    <code>{truncateMiddle(item.holder_did, 12, 8)}</code>
                  </div>
                </td>
                <td className="user-creds__td-actions">
                  <CredentialActions
                    item={item}
                    onRevoke={onRevoke}
                    onViewJson={onToggleJson}
                    revokingId={revokingId}
                    allowRevoke={allowRevoke}
                    onCheckChain={onCheckChain}
                    chainLoadingId={chainLoadingId}
                  />
                </td>
              </tr>
              <CredentialJsonRow
                item={item}
                expanded={expandedId === item.credential_id}
                onClose={() => onToggleJson(item)}
              />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CredentialsCards({
  items,
  onRevoke,
  onViewJson,
  revokingId,
  allowRevoke = true,
  onCheckChain,
  chainLoadingId,
  chainInfoById = {},
  showChainStatus = false,
}) {
  return (
    <div className="user-creds__cards user-creds__mobile-only">
      {items.map((item) => {
        const active = isActiveCredential(item)
        const revoked = isRevokedCredential(item)
        const checking = chainLoadingId === item.credential_id
        const sbtImageUrl = getSbtImageUrl(item)

        return (
          <article
            key={item.credential_id}
            className={`user-creds__card${revoked ? ' user-creds__card--revoked' : ''}`}
          >
            <div className={`user-creds__card-accent user-creds__card-accent--${active ? 'active' : revoked ? 'revoked' : 'neutral'}`} />
            <div className="user-creds__card-header">
              <div>
                <h4 className={revoked ? 'user-creds__card-title--revoked' : ''}>{item.type}</h4>
                <p className="user-creds__card-id">{item.credential_id}</p>
              </div>
              <StatusBadge item={item} />
            </div>

            <div className="user-creds__card-meta">
              <div className="user-creds__card-meta-row">
                <span>Issuer</span>
                <code>{truncateMiddle(item.issuer, 10, 6)}</code>
              </div>
              <div className="user-creds__card-meta-row">
                <span>Holder</span>
                <code>{truncateMiddle(item.holder_did, 10, 6)}</code>
              </div>
              <div className="user-creds__card-meta-row">
                <span>Issued</span>
                <span>{formatCredentialDate(getIssuanceDate(item))}</span>
              </div>
              <CredentialIpfsLinks item={item} />
              {showChainStatus && (
                <ChainStatusPills item={item} chainInfo={chainInfoById[item.credential_id]} />
              )}
            </div>

            {revoked && item.revoke_reason && (
              <div className="user-creds__revoke-reason">
                <MaterialIcon name="warning" size={18} />
                <div>
                  <strong>Revoked</strong>
                  <p>{item.revoke_reason}</p>
                </div>
              </div>
            )}

            <div className="user-creds__card-footer">
              {sbtImageUrl && (
                <a
                  href={sbtImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="user-creds__action user-creds__action--image"
                >
                  <MaterialIcon name="photo" size={16} />
                  View SBT Image
                </a>
              )}
              <button type="button" className="user-creds__action user-creds__action--json" onClick={() => onViewJson(item)}>
                <MaterialIcon name="code" size={16} />
                View JSON
              </button>
              {onCheckChain && (
                <button
                  type="button"
                  className="user-creds__action user-creds__action--json"
                  onClick={() => onCheckChain(item)}
                  disabled={checking}
                >
                  <MaterialIcon name="hub" size={16} />
                  {checking ? 'Checking…' : 'Chain status'}
                </button>
              )}
              {allowRevoke && active && (
                <button
                  type="button"
                  className="user-creds__btn-revoke"
                  onClick={() => onRevoke(item)}
                  disabled={Boolean(revokingId)}
                >
                  <MaterialIcon name="block" size={18} />
                  {revokingId === item.credential_id ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function CredentialsPagination({ pagination, onPageChange, loading }) {
  if (!pagination) return null

  const { page, total_pages, total_items, page_size, has_previous, has_next } = pagination
  const start = total_items === 0 ? 0 : (page - 1) * page_size + 1
  const end = Math.min(page * page_size, total_items)

  return (
    <div className="user-creds__pagination">
      <p>
        Showing <strong>{start}-{end}</strong> of <strong>{total_items}</strong> items
      </p>
      <div className="user-creds__pagination-controls">
        <button
          type="button"
          className="user-creds__page-btn"
          disabled={!has_previous || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <MaterialIcon name="chevron_left" size={18} />
          Prev
        </button>
        <span className="user-creds__page-indicator">
          Page {page} of {Math.max(total_pages, 1)}
        </span>
        <button
          type="button"
          className="user-creds__page-btn"
          disabled={!has_next || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <MaterialIcon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  )
}

export function RevokeCredentialModal({ item, loading, onConfirm, onCancel }) {
  const [reason, setReason] = useState('Administrative revocation')

  if (!item) return null

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget && !loading) {
      onCancel()
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    onConfirm(reason.trim() || 'Administrative revocation')
  }

  return (
    <div
      className="user-creds__modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-credential-title"
      onClick={handleOverlayClick}
    >
      <div className="user-creds__modal user-creds__modal--confirm">
        <div className="user-creds__modal-header">
          <h3 id="revoke-credential-title">Revoke credential</h3>
          <button type="button" onClick={onCancel} disabled={loading} aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>

        <form className="user-creds__confirm-body" onSubmit={handleSubmit}>
          <div className="user-creds__confirm-icon-wrap">
            <MaterialIcon name="warning" size={32} filled />
          </div>
          <p className="user-creds__confirm-lead">
            This will mark the credential as revoked. On-chain revocation may continue asynchronously.
          </p>

          <dl className="user-creds__confirm-meta">
            <div>
              <dt>Type</dt>
              <dd>{item.type}</dd>
            </div>
            <div>
              <dt>Credential ID</dt>
              <dd>
                <code>{item.credential_id}</code>
              </dd>
            </div>
          </dl>

          <label className="user-creds__confirm-label" htmlFor="revoke-reason">
            Reason (optional)
          </label>
          <textarea
            id="revoke-reason"
            className="user-creds__confirm-textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder="Why is this credential being revoked?"
          />

          <div className="user-creds__confirm-actions">
            <button
              type="button"
              className="user-creds__confirm-btn user-creds__confirm-btn--secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="user-creds__confirm-btn user-creds__confirm-btn--danger"
              disabled={loading}
            >
              <MaterialIcon name="block" size={18} />
              {loading ? 'Revoking…' : 'Revoke credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CredentialJsonModal({ item, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(item?.credential, null, 2)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="user-creds__modal-overlay" role="dialog" aria-modal="true" aria-label="Credential JSON">
      <div className="user-creds__modal">
        <div className="user-creds__modal-header">
          <h3>Signed Credential JSON</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="user-creds__modal-body">
          <pre>{json}</pre>
        </div>
        <div className="user-creds__modal-footer">
          <button type="button" className="user-creds__page-btn" onClick={handleCopy}>
            <MaterialIcon name={copied ? 'check' : 'content_copy'} size={18} />
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CredentialsErrorState({ message, onRetry }) {
  return (
    <section className="user-creds__error">
      <MaterialIcon name="error" size={40} />
      <h3>Unable to load credentials</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="user-creds__lookup-submit user-creds__lookup-submit--inline" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

export function CredentialsEmptyResults({ username, title, message }) {
  return (
    <section className="user-creds__empty-results">
      <MaterialIcon name="badge" size={40} />
      <h3>{title || 'No credentials found'}</h3>
      <p>
        {message || (
          <>
            User <strong>{username}</strong> has no issued credentials yet.
          </>
        )}
      </p>
    </section>
  )
}

export function CredentialsNoDidState({ onGoToDid }) {
  return (
    <section className="user-creds__empty-results">
      <MaterialIcon name="fingerprint" size={40} />
      <h3>DID not ready yet</h3>
      <p>
        Your wallet does not have a DID document yet, so credentials cannot be listed. Check My DID
        for provisioning status.
      </p>
      {onGoToDid && (
        <button type="button" className="user-creds__lookup-submit user-creds__lookup-submit--inline" onClick={onGoToDid}>
          Go to My DID
        </button>
      )}
    </section>
  )
}
