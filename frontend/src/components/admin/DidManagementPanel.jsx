import { useState } from 'react'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { copyToClipboard, truncateMiddle } from '@/utils/didFormat'

export function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyToClipboard(value)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" className="did-mgmt__copy-btn" onClick={handleCopy} aria-label={label}>
      <MaterialIcon name={copied ? 'check' : 'content_copy'} size={18} />
    </button>
  )
}

export function DidSearchBar({ value, onChange, onSubmit, loading, compact = false }) {
  return (
    <section className={`did-mgmt__search${compact ? ' did-mgmt__search--compact' : ''}`}>
      {!compact && (
        <label className="did-mgmt__search-label" htmlFor="did-search-input">
          Decentralized Identifier (DID)
        </label>
      )}
      <form className="did-mgmt__search-form" onSubmit={onSubmit}>
        <div className="did-mgmt__search-input-wrap">
          <MaterialIcon name="search" size={20} className="did-mgmt__search-icon" />
          <input
            id="did-search-input"
            type="text"
            className="did-mgmt__search-input"
            placeholder={compact ? 'Search DIDs...' : 'Enter DID string...'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="did-mgmt__search-submit" disabled={loading || !value.trim()}>
            {loading ? 'Resolving…' : 'Resolve'}
          </button>
        </div>
        {!compact && (
          <p className="did-mgmt__search-hint">Example: did:ethr:0x1C7e...</p>
        )}
      </form>
    </section>
  )
}

export function DidIdleState() {
  return (
    <section className="did-mgmt__idle">
      <div className="did-mgmt__idle-icon-wrap">
        <MaterialIcon name="manage_search" size={48} className="did-mgmt__idle-icon did-mgmt__idle-icon--desktop" />
        <MaterialIcon name="hub" size={32} className="did-mgmt__idle-icon did-mgmt__idle-icon--mobile" />
      </div>
      <h3>Ready to Resolve</h3>
      <p className="did-mgmt__idle-text did-mgmt__idle-text--desktop">
        Enter a Decentralized Identifier (DID) in the search bar above to query the network. You can view
        document details, verification methods, and service endpoints.
      </p>
      <p className="did-mgmt__idle-text did-mgmt__idle-text--mobile">
        Enter a DID string above to view its document, keys, and registry status.
      </p>
    </section>
  )
}

export function DidStatusBadge({ kind, label, icon }) {
  return (
    <span className={`did-mgmt__badge did-mgmt__badge--${kind}`}>
      {icon && <MaterialIcon name={icon} size={14} filled={kind === 'healthy' || kind === 'active'} />}
      {label}
    </span>
  )
}

export function DidMonoField({ label, value, copyable = false, truncate = false }) {
  const display = truncate ? truncateMiddle(value, 8, 6) : value
  return (
    <div className="did-mgmt__mono-field">
      <span className="did-mgmt__field-label">{label}</span>
      <div className="did-mgmt__mono-box">
        <span className="did-mgmt__mono-value">{display || '—'}</span>
        {copyable && value && <CopyButton value={value} label={`Copy ${label}`} />}
      </div>
    </div>
  )
}
