import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { formatRoleLabel } from '@/utils/roles'
import { formatUtcDate, truncateMiddle } from '@/utils/didFormat'

function IssuerStatusPill({ authorized }) {
  if (authorized === true) {
    return (
      <span className="admin-mgmt__issuer-pill admin-mgmt__issuer-pill--yes">
        <MaterialIcon name="verified" size={14} />
        Authorized Issuer
      </span>
    )
  }

  if (authorized === false) {
    return (
      <span className="admin-mgmt__issuer-pill admin-mgmt__issuer-pill--no">
        <MaterialIcon name="gpp_bad" size={14} />
        Not Authorized
      </span>
    )
  }

  return (
    <span className="admin-mgmt__issuer-pill admin-mgmt__issuer-pill--unknown">
      <MaterialIcon name="help" size={14} />
      Unknown
    </span>
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
      /* ignore */
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

export function AdminManagementFilters({ search, loading, onSearchChange, onSubmit, onAddAdmin }) {
  return (
    <section className="user-dir__filters admin-mgmt__filters">
      <form className="user-dir__filters-form" onSubmit={onSubmit}>
        <div className="user-dir__filter-field user-dir__filter-field--search">
          <label className="user-dir__filter-label" htmlFor="admin-mgmt-search">
            Search
          </label>
          <div className="user-dir__filter-input-wrap">
            <MaterialIcon name="search" size={20} className="user-dir__filter-icon" />
            <input
              id="admin-mgmt-search"
              type="search"
              className="user-dir__filter-input"
              placeholder="Username or email"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="user-dir__filter-submit" disabled={loading}>
          <MaterialIcon name="filter_list" size={18} />
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>

      <button type="button" className="admin-mgmt__add-btn" onClick={onAddAdmin}>
        <MaterialIcon name="person_add" size={18} />
        Add Admin
      </button>
    </section>
  )
}

export function AdminManagementTable({ items, selectedUserId, onSelect, loading }) {
  if (loading && items.length === 0) {
    return (
      <section className="user-dir__loading">
        <div className="state-panel__spinner" aria-hidden="true" />
        <p>Loading admins…</p>
      </section>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <section className="user-dir__empty">
        <MaterialIcon name="admin_panel_settings" size={48} />
        <h3>No admins found</h3>
        <p>Register a new admin to get started.</p>
      </section>
    )
  }

  return (
    <div className="user-dir__table-wrap">
      <table className="user-dir__table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Issuer Status</th>
            <th className="user-dir__th-hide-mobile">ETH Address</th>
            <th className="user-dir__th-hide-mobile">DID</th>
            <th className="user-dir__th-hide-mobile">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.user_id}
              className={selectedUserId === item.user_id ? 'user-dir__row--selected' : ''}
              onClick={() => onSelect(item.user_id)}
            >
              <td>
                <div className="user-dir__user-cell">
                  <strong>{item.username}</strong>
                  <span>{item.email || 'No email'}</span>
                </div>
              </td>
              <td>
                <IssuerStatusPill authorized={item.is_authorized_issuer} />
              </td>
              <td className="user-dir__th-hide-mobile">
                <code>{truncateMiddle(item.eth_address, 10, 8)}</code>
              </td>
              <td className="user-dir__th-hide-mobile">
                {item.has_did ? (
                  <code>{truncateMiddle(item.did, 12, 8)}</code>
                ) : (
                  <span className="user-dir__muted">Pending</span>
                )}
              </td>
              <td className="user-dir__th-hide-mobile">{formatUtcDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminManagementDetail({
  admin,
  loading,
  error,
  actionError,
  actionLoading,
  onClose,
  onAuthorize,
  onRevoke,
  onDelete,
}) {
  if (!admin && !loading && !error) return null

  return (
    <aside className="user-dir__detail-panel admin-mgmt__detail">
      <div className="user-dir__detail-header">
        <div>
          <h2>Admin Details</h2>
          {admin && <p>{formatRoleLabel(admin.role)}</p>}
        </div>
        <button type="button" className="user-dir__detail-close" onClick={onClose} aria-label="Close details">
          <MaterialIcon name="close" />
        </button>
      </div>

      {loading && (
        <div className="user-dir__detail-loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Loading details…</p>
        </div>
      )}

      {error && (
        <div className="user-dir__error-banner" role="alert">
          {error}
        </div>
      )}

      {admin && !loading && (
        <>
          <div className="user-dir__detail-grid">
            <DetailField label="Username" value={admin.username} />
            <DetailField label="Email" value={admin.email} />
            <DetailField label="User ID" value={String(admin.user_id)} />
            <DetailField label="Created" value={formatUtcDate(admin.created_at)} />
            <DetailField label="ETH Address" value={admin.eth_address} mono copyable />
            <DetailField label="DID" value={admin.did} mono copyable />
            <DetailField
              label="DID Status"
              value={
                !admin.has_did
                  ? 'Pending'
                  : admin.did_active === false
                    ? 'Deactivated'
                    : 'Active'
              }
            />
            <div className="user-dir__detail-field">
              <span className="user-dir__detail-label">Authorized Issuer</span>
              <IssuerStatusPill authorized={admin.is_authorized_issuer} />
            </div>
          </div>

          {actionError && (
            <div className="user-dir__error-banner" role="alert">
              {actionError}
            </div>
          )}

          <div className="admin-mgmt__detail-actions">
            {admin.is_authorized_issuer === true ? (
              <button
                type="button"
                className="admin-mgmt__action-btn admin-mgmt__action-btn--danger"
                onClick={onRevoke}
                disabled={actionLoading || !admin.eth_address}
              >
                <MaterialIcon name="gpp_bad" size={18} />
                {actionLoading ? 'Revoking…' : 'Revoke Authorized Issuer'}
              </button>
            ) : (
              <button
                type="button"
                className="admin-mgmt__action-btn admin-mgmt__action-btn--primary"
                onClick={onAuthorize}
                disabled={actionLoading || !admin.eth_address}
              >
                <MaterialIcon name="verified_user" size={18} />
                {actionLoading ? 'Authorizing…' : 'Authorize Issuer'}
              </button>
            )}

            <button
              type="button"
              className="admin-mgmt__action-btn admin-mgmt__action-btn--secondary"
              onClick={onDelete}
              disabled={actionLoading}
            >
              <MaterialIcon name="person_remove" size={18} />
              Delete Admin
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

export function DeleteAdminModal({ admin, loading, onConfirm, onCancel }) {
  if (!admin) return null

  return (
    <div className="user-creds__modal-overlay" role="dialog" aria-modal="true" aria-label="Delete admin">
      <div className="user-creds__modal user-creds__modal--confirm">
        <div className="user-creds__modal-header">
          <h3>Delete admin</h3>
          <button type="button" onClick={onCancel} disabled={loading} aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="user-creds__confirm-body">
          <div className="user-creds__confirm-icon-wrap">
            <MaterialIcon name="warning" size={32} filled />
          </div>
          <p className="user-creds__confirm-lead">
            This permanently removes admin <strong>{admin.username}</strong> and their DID record from
            the system. On-chain issuer status is not changed automatically.
          </p>
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
              type="button"
              className="user-creds__confirm-btn user-creds__confirm-btn--danger"
              onClick={onConfirm}
              disabled={loading}
            >
              <MaterialIcon name="person_remove" size={18} />
              {loading ? 'Deleting…' : 'Delete admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminManagementPagination({ pagination, onPageChange, loading }) {
  if (!pagination) return null

  const { page, total_pages, total_items, page_size, has_previous, has_next } = pagination
  const start = total_items === 0 ? 0 : (page - 1) * page_size + 1
  const end = Math.min(page * page_size, total_items)

  return (
    <div className="user-dir__pagination">
      <p>
        Showing <strong>{start}-{end}</strong> of <strong>{total_items}</strong> admins
      </p>
      <div className="user-dir__pagination-controls">
        <button
          type="button"
          className="user-dir__page-btn"
          disabled={!has_previous || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span>
          Page {page} of {Math.max(total_pages, 1)}
        </span>
        <button
          type="button"
          className="user-dir__page-btn"
          disabled={!has_next || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function AdminAddShortcut() {
  return (
    <p className="admin-mgmt__hint">
      To create a new admin, use{' '}
      <Link to="/admin/users">Register User</Link> and select the Admin role.
    </p>
  )
}
