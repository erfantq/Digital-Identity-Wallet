import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { formatRoleLabel } from '@/utils/roles'
import { truncateMiddle } from '@/utils/didFormat'

const QUICK_ACTIONS = [
  { to: '/admin/issue', label: 'Issue Credential', icon: 'verified_user', primary: true },
  { to: '/admin/users', label: 'Register User', icon: 'person_add' },
  { to: '/admin/directory', label: 'All Users', icon: 'groups' },
  { to: '/admin/dids', label: 'DID Management', icon: 'fingerprint' },
  { to: '/admin/credentials', label: 'User Credentials', icon: 'badge' },
]

const ROLE_ORDER = ['admin', 'teacher', 'student', 'user']

function formatTypeLabel(type) {
  if (!type) return 'Unknown'
  return type
    .replace(/Credential$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ icon, label, value, hint, tone = 'default' }) {
  return (
    <article className={`admin-dash__stat admin-dash__stat--${tone}`}>
      <div className="admin-dash__stat-icon-wrap">
        <MaterialIcon name={icon} size={24} />
      </div>
      <div>
        <p className="admin-dash__stat-label">{label}</p>
        <p className="admin-dash__stat-value">{value}</p>
        {hint && <p className="admin-dash__stat-hint">{hint}</p>}
      </div>
    </article>
  )
}

function BreakdownBar({ label, count, total, tone = 'default' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="admin-dash__breakdown-row">
      <div className="admin-dash__breakdown-meta">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="admin-dash__breakdown-track">
        <div
          className={`admin-dash__breakdown-fill admin-dash__breakdown-fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PipelineItem({ icon, label, value, tone }) {
  return (
    <div className={`admin-dash__pipeline-item admin-dash__pipeline-item--${tone}`}>
      <MaterialIcon name={icon} size={20} />
      <div>
        <span className="admin-dash__pipeline-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function CredentialChainPill({ item }) {
  if (item.sbt_token_id != null) {
    return <span className="admin-dash__pill admin-dash__pill--minted">SBT minted</span>
  }
  if (item.tx_hash) {
    return <span className="admin-dash__pill admin-dash__pill--confirming">On-chain</span>
  }
  return <span className="admin-dash__pill admin-dash__pill--pending">Pending</span>
}

export function AdminDashboard({ data, username, onRefresh, loading }) {
  const summary = data?.summary ?? {}
  const usersByRole = data?.users_by_role ?? {}
  const credentialsByType = data?.credentials_by_type ?? []
  const recentUsers = data?.recent_users ?? []
  const recentCredentials = data?.recent_credentials ?? []

  const roleTotal = Object.values(usersByRole).reduce((sum, n) => sum + n, 0)
  const credTypeTotal = credentialsByType.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back{username ? `, ${username}` : ''}. Operational overview of users, DIDs, and
            credentials.
          </p>
        </div>
        <button
          type="button"
          className="admin-dash__refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          <MaterialIcon name="refresh" size={20} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="admin-dash__stats-grid">
        <StatCard
          icon="groups"
          label="Total Users"
          value={summary.total_users ?? 0}
          hint={`${summary.pending_dids ?? 0} without DID`}
        />
        <StatCard
          icon="fingerprint"
          label="Active DIDs"
          value={summary.active_dids ?? 0}
          hint={`${summary.deactivated_dids ?? 0} deactivated`}
          tone="did"
        />
        <StatCard
          icon="badge"
          label="Active Credentials"
          value={summary.active_credentials ?? 0}
          hint={`${summary.revoked_credentials ?? 0} revoked`}
          tone="cred"
        />
        <StatCard
          icon="token"
          label="SBT Minted"
          value={summary.sbt_minted ?? 0}
          hint={`${summary.sbt_pending ?? 0} pending mint`}
          tone="sbt"
        />
      </section>

      <section className="admin-dash__pipeline">
        <h2>
          <MaterialIcon name="hub" size={22} />
          On-chain pipeline
        </h2>
        <div className="admin-dash__pipeline-grid">
          <PipelineItem
            icon="link"
            label="Registry anchored"
            value={summary.on_chain_registered ?? 0}
            tone="ok"
          />
          <PipelineItem
            icon="schedule"
            label="Registry pending"
            value={summary.registry_pending ?? 0}
            tone="warn"
          />
          <PipelineItem
            icon="schedule"
            label="SBT pending"
            value={summary.sbt_pending ?? 0}
            tone="warn"
          />
          <PipelineItem
            icon="inventory_2"
            label="Total credentials"
            value={summary.total_credentials ?? 0}
            tone="neutral"
          />
        </div>
      </section>

      <div className="admin-dash__split">
        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="pie_chart" size={22} />
              Users by role
            </h2>
            <Link to="/admin/directory" className="admin-dash__card-link">
              View all
              <MaterialIcon name="arrow_forward" size={16} />
            </Link>
          </div>
          {ROLE_ORDER.filter((role) => usersByRole[role] != null).map((role) => (
            <BreakdownBar
              key={role}
              label={formatRoleLabel(role)}
              count={usersByRole[role] ?? 0}
              total={roleTotal}
              tone={role}
            />
          ))}
          {roleTotal === 0 && <p className="admin-dash__empty">No users registered yet.</p>}
        </section>

        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="category" size={22} />
              Credentials by type
            </h2>
            <Link to="/admin/credentials" className="admin-dash__card-link">
              Manage
              <MaterialIcon name="arrow_forward" size={16} />
            </Link>
          </div>
          {credentialsByType.map((row) => (
            <BreakdownBar
              key={row.type}
              label={formatTypeLabel(row.type)}
              count={row.count}
              total={credTypeTotal}
              tone="cred"
            />
          ))}
          {credTypeTotal === 0 && (
            <p className="admin-dash__empty">No credentials issued yet.</p>
          )}
        </section>
      </div>

      <div className="admin-dash__split">
        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="person_add" size={22} />
              Recent users
            </h2>
          </div>
          {recentUsers.length === 0 ? (
            <p className="admin-dash__empty">No users yet.</p>
          ) : (
            <ul className="admin-dash__list">
              {recentUsers.map((user) => (
                <li key={user.user_id} className="admin-dash__list-item">
                  <div>
                    <strong>{user.username}</strong>
                    <span className="admin-dash__list-sub">
                      {formatRoleLabel(user.role)}
                      {user.has_did
                        ? user.did_active === false
                          ? ' · DID deactivated'
                          : ' · DID active'
                        : ' · DID pending'}
                    </span>
                  </div>
                  <span className="admin-dash__list-meta">
                    {formatDate(user.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="history" size={22} />
              Recent credentials
            </h2>
          </div>
          {recentCredentials.length === 0 ? (
            <p className="admin-dash__empty">No credentials issued yet.</p>
          ) : (
            <ul className="admin-dash__list">
              {recentCredentials.map((item) => (
                <li key={item.credential_id} className="admin-dash__list-item admin-dash__list-item--stack">
                  <div>
                    <strong>{formatTypeLabel(item.type)}</strong>
                    <span className="admin-dash__list-sub">
                      {item.holder_username
                        ? `@${item.holder_username}`
                        : truncateMiddle(item.holder_did, 10, 6)}
                    </span>
                  </div>
                  <div className="admin-dash__list-tags">
                    <span
                      className={`admin-dash__pill admin-dash__pill--${
                        item.status === 'revoked' ? 'revoked' : 'active'
                      }`}
                    >
                      {item.status}
                    </span>
                    <CredentialChainPill item={item} />
                  </div>
                  <span className="admin-dash__list-meta">{formatDate(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-dash__card">
        <h2>
          <MaterialIcon name="bolt" size={22} />
          Quick actions
        </h2>
        <div className="admin-dash__actions">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`admin-dash__action${action.primary ? ' admin-dash__action--primary' : ''}`}
            >
              <MaterialIcon name={action.icon} size={20} />
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
