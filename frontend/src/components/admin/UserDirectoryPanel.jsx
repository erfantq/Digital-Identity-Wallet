import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { DIRECTORY_ROLE_FILTER_OPTIONS } from '@/features/admin/adminNav'
import { formatRoleLabel } from '@/utils/roles'
import { formatUtcDate, truncateMiddle } from '@/utils/didFormat'

function RoleBadge({ role }) {
  const kind =
    role === 'super_admin'
      ? 'super_admin'
      : role === 'admin'
        ? 'admin'
        : role === 'student'
          ? 'student'
          : role === 'teacher'
            ? 'teacher'
            : 'user'

  return (
    <span className={`user-dir__role user-dir__role--${kind}`}>
      {formatRoleLabel(role)}
    </span>
  )
}

function DidStatusPill({ hasDid, didActive, compact = false }) {
  if (!hasDid) {
    return <span className="user-dir__did-pill user-dir__did-pill--no">Pending</span>
  }

  if (didActive === false) {
    return (
      <span className="user-dir__did-pill user-dir__did-pill--deactivated">
        <MaterialIcon name="block" size={14} />
        Deactivated
      </span>
    )
  }

  return (
    <span className="user-dir__did-pill user-dir__did-pill--yes">
      <MaterialIcon name="check_circle" size={14} />
      {compact ? 'Provisioned' : 'Active'}
    </span>
  )
}

function CopyableUsername({ username }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(event) {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(username)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      className={`user-dir__username user-dir__username--copy${copied ? ' user-dir__username--copied' : ''}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Click to copy username'}
      aria-label={copied ? 'Username copied' : `Copy username ${username}`}
    >
      {username}
      <MaterialIcon name={copied ? 'check' : 'content_copy'} size={14} className="user-dir__username-icon" />
    </button>
  )
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button type="button" className="user-dir__copy-btn" onClick={handleCopy} aria-label={label}>
      <MaterialIcon name={copied ? 'check' : 'content_copy'} size={18} />
    </button>
  )
}

function DetailField({ label, value, mono = false, copyable = false }) {
  if (value == null || value === '') {
    return (
      <div className="user-dir__detail-field">
        <span className="user-dir__detail-label">{label}</span>
        <span className="user-dir__detail-value">—</span>
      </div>
    )
  }

  return (
    <div className="user-dir__detail-field">
      <span className="user-dir__detail-label">{label}</span>
      <div className="user-dir__detail-value-row">
        <span className={mono ? 'user-dir__detail-mono' : 'user-dir__detail-value'}>{value}</span>
        {copyable && <CopyButton value={value} label={`Copy ${label}`} />}
      </div>
    </div>
  )
}

export function UserDirectoryFilters({
  search,
  role,
  loading,
  onSearchChange,
  onRoleChange,
  onSubmit,
}) {
  return (
    <section className="user-dir__filters">
      <form className="user-dir__filters-form" onSubmit={onSubmit}>
        <div className="user-dir__filter-field user-dir__filter-field--search">
          <label className="user-dir__filter-label" htmlFor="user-dir-search">
            Search
          </label>
          <div className="user-dir__filter-input-wrap">
            <MaterialIcon name="search" size={20} className="user-dir__filter-icon" />
            <input
              id="user-dir-search"
              type="search"
              className="user-dir__filter-input"
              placeholder="Username or email"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="user-dir__filter-field">
          <label className="user-dir__filter-label" htmlFor="user-dir-role">
            Role
          </label>
          <div className="user-dir__filter-input-wrap user-dir__filter-input-wrap--select">
            <select
              id="user-dir-role"
              className="user-dir__filter-select"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              disabled={loading}
            >
              <option value="">All roles</option>
              {DIRECTORY_ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialIcon name="expand_more" size={20} className="user-dir__select-chevron" />
          </div>
        </div>

        <button type="submit" className="user-dir__filter-submit" disabled={loading}>
          <MaterialIcon name="filter_list" size={18} />
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>
    </section>
  )
}

export function UserDirectoryTable({ items, selectedUserId, onSelect, loading }) {
  if (loading && items.length === 0) {
    return (
      <section className="user-dir__loading">
        <div className="state-panel__spinner" aria-hidden="true" />
        <p>Loading users…</p>
      </section>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <section className="user-dir__empty">
        <MaterialIcon name="group_off" size={48} />
        <h3>No users found</h3>
        <p>Try adjusting your search or role filter.</p>
      </section>
    )
  }

  return (
    <div className="user-dir__table-wrap">
      <table className="user-dir__table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th className="user-dir__th-hide-mobile">ETH Address</th>
            <th className="user-dir__th-hide-mobile">DID</th>
            <th className="user-dir__th-hide-mobile">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = selectedUserId === item.user_id
            return (
              <tr
                key={item.user_id}
                className={selected ? 'user-dir__row--selected' : ''}
                onClick={() => onSelect(item.user_id)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(item.user_id)
                  }
                }}
                role="button"
                aria-pressed={selected}
              >
                <td>
                  <div className="user-dir__user-cell">
                    <CopyableUsername username={item.username} />
                    <span className="user-dir__user-meta">ID {item.user_id}</span>
                    {item.email && <span className="user-dir__user-email">{item.email}</span>}
                  </div>
                </td>
                <td>
                  <RoleBadge role={item.role} />
                </td>
                <td className="user-dir__th-hide-mobile">
                  <code>{truncateMiddle(item.eth_address, 8, 6)}</code>
                </td>
                <td className="user-dir__th-hide-mobile">
                  <DidStatusPill hasDid={item.has_did} didActive={item.did_active} compact />
                </td>
                <td className="user-dir__th-hide-mobile">{formatUtcDate(item.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function UserDirectoryPagination({ pagination, onPageChange, loading }) {
  if (!pagination) return null

  const { page, total_pages, total_items, page_size, has_previous, has_next } = pagination
  const start = total_items === 0 ? 0 : (page - 1) * page_size + 1
  const end = Math.min(page * page_size, total_items)

  return (
    <div className="user-dir__pagination">
      <p>
        Showing <strong>{start}-{end}</strong> of <strong>{total_items}</strong> users
      </p>
      <div className="user-dir__pagination-controls">
        <button
          type="button"
          className="user-dir__page-btn"
          disabled={!has_previous || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <MaterialIcon name="chevron_left" size={18} />
          Prev
        </button>
        <span className="user-dir__page-indicator">
          Page {page} of {Math.max(total_pages, 1)}
        </span>
        <button
          type="button"
          className="user-dir__page-btn"
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

export function UserDirectoryDetail({ user, loading, error, onClose }) {
  if (!user && !loading && !error) {
    return (
      <aside className="user-dir__detail user-dir__detail--idle">
        <MaterialIcon name="touch_app" size={40} />
        <h3>Select a user</h3>
        <p>Click a row in the table to view account and DID details.</p>
      </aside>
    )
  }

  if (loading) {
    return (
      <aside className="user-dir__detail user-dir__detail--loading">
        <div className="state-panel__spinner" aria-hidden="true" />
        <p>Loading user details…</p>
      </aside>
    )
  }

  if (error) {
    return (
      <aside className="user-dir__detail user-dir__detail--error" role="alert">
        <MaterialIcon name="error" size={32} filled />
        <p>{error}</p>
      </aside>
    )
  }

  const did = user.did_details
  const didActive = did?.active ?? user.did_active
  const holderDid = did?.did || user.did || null

  return (
    <aside className="user-dir__detail">
      <div className="user-dir__detail-header">
        <div>
          <h2>{user.username}</h2>
          <p>User ID {user.user_id}</p>
        </div>
        <button type="button" className="user-dir__detail-close" onClick={onClose} aria-label="Close details">
          <MaterialIcon name="close" size={20} />
        </button>
      </div>

      <div className="user-dir__detail-section">
        <h3>Account</h3>
        <div className="user-dir__detail-grid">
          <DetailField label="Username" value={user.username} copyable />
          <DetailField label="Email" value={user.email} />
          <DetailField label="Role" value={formatRoleLabel(user.role)} />
          <DetailField label="Wallet Index" value={String(user.wallet_index)} />
          <DetailField label="Created" value={formatUtcDate(user.created_at)} />
          <DetailField label="ETH Address" value={user.eth_address} mono copyable />
        </div>
      </div>

      <div className="user-dir__detail-section">
        <div className="user-dir__detail-section-head">
          <h3>Decentralized Identity</h3>
          <DidStatusPill hasDid={user.has_did} didActive={didActive} />
        </div>

        {did || holderDid ? (
          <div className="user-dir__detail-grid">
            <DetailField label="DID" value={holderDid} mono copyable />
            {did && (
              <>
                <DetailField label="Document Hash" value={did.document_hash} mono copyable />
                <DetailField label="TX Hash" value={did.tx_hash} mono copyable />
                <DetailField label="Block Number" value={did.block_number != null ? String(did.block_number) : null} />
                <DetailField label="DID Created" value={formatUtcDate(did.created_at)} />
              </>
            )}
          </div>
        ) : (
          <p className="user-dir__detail-note">
            DID provisioning is still pending or failed. The user can sign in once registration completes.
          </p>
        )}
      </div>

      <div className="user-dir__detail-actions">
        <Link
          to="/admin/issue"
          className={`user-dir__action-btn user-dir__action-btn--primary${!holderDid ? ' user-dir__action-btn--disabled' : ''}`}
          state={holderDid ? { holderDid } : undefined}
          aria-disabled={!holderDid}
          onClick={(event) => {
            if (!holderDid) event.preventDefault()
          }}
        >
          <MaterialIcon name="verified_user" size={18} />
          Issue Credential
        </Link>
        <Link
          to="/admin/credentials"
          className="user-dir__action-btn user-dir__action-btn--outline"
          state={{ username: user.username }}
        >
          <MaterialIcon name="badge" size={18} />
          View Credentials
        </Link>
      </div>
    </aside>
  )
}
