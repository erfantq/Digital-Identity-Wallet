import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { formatRoleLabel } from '@/utils/roles'
import {
  getIssuanceDate,
  isActiveCredential,
  isRevokedCredential,
  truncateMiddle,
} from '@/utils/credentialFormat'

const QUICK_ACTIONS = [
  { to: '/wallet/credentials', label: 'My Credentials', icon: 'badge', primary: true },
  { to: '/wallet/did', label: 'My DID', icon: 'fingerprint' },
  { to: '/wallet/resolve', label: 'Resolve DID', icon: 'search' },
  { to: '/wallet/verify', label: 'Verify Credential', icon: 'verified' },
]

function formatTypeLabel(type) {
  if (!type) return 'Unknown'
  return type
    .replace(/Credential$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function formatDateTime(value) {
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

function DidStatusBanner({ didState }) {
  if (didState.status === 'missing') {
    return (
      <div className="wallet-overview__did-banner wallet-overview__did-banner--warn">
        <MaterialIcon name="hourglass_empty" size={22} />
        <div>
          <strong>DID provisioning pending</strong>
          <p>Your wallet account does not have a DID document yet. Credentials cannot be listed until DID creation finishes.</p>
        </div>
        <Link to="/wallet/did" className="wallet-overview__did-link">
          Check status
          <MaterialIcon name="arrow_forward" size={16} />
        </Link>
      </div>
    )
  }

  if (didState.status === 'deactivated') {
    return (
      <div className="wallet-overview__did-banner wallet-overview__did-banner--error">
        <MaterialIcon name="cancel" size={22} filled />
        <div>
          <strong>DID deactivated</strong>
          <p>{didState.message || 'Your DID is deactivated on-chain.'}</p>
        </div>
        <Link to="/wallet/did" className="wallet-overview__did-link">
          View DID
          <MaterialIcon name="arrow_forward" size={16} />
        </Link>
      </div>
    )
  }

  if (didState.status === 'warning') {
    return (
      <div className="wallet-overview__did-banner wallet-overview__did-banner--warn">
        <MaterialIcon name="warning" size={22} filled />
        <div>
          <strong>DID needs attention</strong>
          <p>{didState.message || 'There is a warning for your DID resolution.'}</p>
        </div>
        <Link to="/wallet/did" className="wallet-overview__did-link">
          View DID
          <MaterialIcon name="arrow_forward" size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="wallet-overview__did-banner wallet-overview__did-banner--ok">
      <MaterialIcon name="check_circle" size={22} filled />
      <div>
        <strong>DID healthy</strong>
        <p>
          <code>{truncateMiddle(didState.did, 18, 10)}</code>
          {didState.onChainRegistered === true
            ? ' · Anchored on-chain'
            : didState.onChainRegistered === false
              ? ' · Not found on-chain'
              : ''}
        </p>
      </div>
      <Link to="/wallet/did" className="wallet-overview__did-link">
        View DID
        <MaterialIcon name="arrow_forward" size={16} />
      </Link>
    </div>
  )
}

export function WalletOverviewDashboard({
  user,
  summary,
  credentialsByType,
  recentCredentials,
  didState,
  onRefresh,
  loading,
}) {
  const credTypeTotal = credentialsByType.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="admin-dash wallet-overview">
      <header className="admin-dash__header">
        <div>
          <h1>Overview</h1>
          <p>
            Welcome back{user?.username ? `, ${user.username}` : ''}. Your wallet identity,
            credentials, and on-chain status at a glance.
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

      <DidStatusBanner didState={didState} />

      <section className="admin-dash__stats-grid">
        <StatCard
          icon="badge"
          label="Total Credentials"
          value={summary.totalCredentials}
          hint={`${summary.activeCredentials} active`}
          tone="cred"
        />
        <StatCard
          icon="verified"
          label="Active"
          value={summary.activeCredentials}
          hint={`${summary.revokedCredentials} revoked`}
          tone="did"
        />
        <StatCard
          icon="link"
          label="On-chain Registry"
          value={summary.onChainRegistered}
          hint={`${summary.registryPending} pending`}
        />
        <StatCard
          icon="token"
          label="SBT Minted"
          value={summary.sbtMinted}
          hint={`${summary.sbtPending} pending mint`}
          tone="sbt"
        />
      </section>

      <section className="admin-dash__pipeline">
        <h2>
          <MaterialIcon name="hub" size={22} />
          Credential pipeline
        </h2>
        <div className="admin-dash__pipeline-grid">
          <PipelineItem
            icon="inventory_2"
            label="Total held"
            value={summary.totalCredentials}
            tone="neutral"
          />
          <PipelineItem
            icon="link"
            label="Registry anchored"
            value={summary.onChainRegistered}
            tone="ok"
          />
          <PipelineItem
            icon="schedule"
            label="Registry pending"
            value={summary.registryPending}
            tone="warn"
          />
          <PipelineItem
            icon="schedule"
            label="SBT pending"
            value={summary.sbtPending}
            tone="warn"
          />
        </div>
      </section>

      <div className="admin-dash__split">
        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="person" size={22} />
              Account
            </h2>
          </div>
          <dl className="wallet-overview__account">
            <div>
              <dt>Username</dt>
              <dd>{user?.username || '—'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{formatRoleLabel(user?.role)}</dd>
            </div>
            <div>
              <dt>Wallet address</dt>
              <dd>
                <code>{user?.ethAddress ? truncateMiddle(user.ethAddress, 10, 8) : '—'}</code>
              </dd>
            </div>
            <div>
              <dt>DID</dt>
              <dd>
                <code>{didState.did ? truncateMiddle(didState.did, 14, 10) : 'Pending'}</code>
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-dash__card">
          <div className="admin-dash__card-header">
            <h2>
              <MaterialIcon name="category" size={22} />
              Credentials by type
            </h2>
            <Link to="/wallet/credentials" className="admin-dash__card-link">
              View all
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
            <p className="admin-dash__empty">No credentials in your wallet yet.</p>
          )}
        </section>
      </div>

      <section className="admin-dash__card">
        <div className="admin-dash__card-header">
          <h2>
            <MaterialIcon name="history" size={22} />
            Recent credentials
          </h2>
          <Link to="/wallet/credentials" className="admin-dash__card-link">
            Manage
            <MaterialIcon name="arrow_forward" size={16} />
          </Link>
        </div>
        {recentCredentials.length === 0 ? (
          <p className="admin-dash__empty">No credentials received yet.</p>
        ) : (
          <ul className="admin-dash__list">
            {recentCredentials.map((item) => (
              <li key={item.credential_id} className="admin-dash__list-item admin-dash__list-item--stack">
                <div>
                  <strong>{formatTypeLabel(item.type)}</strong>
                  <span className="admin-dash__list-sub">
                    {truncateMiddle(item.credential_id, 14, 8)}
                  </span>
                </div>
                <div className="admin-dash__list-tags">
                  <span
                    className={`admin-dash__pill admin-dash__pill--${
                      isRevokedCredential(item) ? 'revoked' : 'active'
                    }`}
                  >
                    {item.status}
                  </span>
                  <CredentialChainPill item={item} />
                </div>
                <span className="admin-dash__list-meta">
                  {formatDateTime(item.created_at || getIssuanceDate(item))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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

export function buildWalletOverviewSummary(items = []) {
  const totalCredentials = items.length
  const activeCredentials = items.filter(isActiveCredential).length
  const revokedCredentials = items.filter(isRevokedCredential).length
  const sbtMinted = items.filter((item) => item.sbt_token_id != null).length
  const onChainRegistered = items.filter((item) => Boolean(item.tx_hash)).length
  const sbtPending = items.filter(
    (item) => isActiveCredential(item) && item.sbt_token_id == null,
  ).length
  const registryPending = items.filter(
    (item) => isActiveCredential(item) && !item.tx_hash,
  ).length

  const typeMap = new Map()
  for (const item of items) {
    const type = item.type || 'Unknown'
    typeMap.set(type, (typeMap.get(type) || 0) + 1)
  }

  const credentialsByType = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return {
    summary: {
      totalCredentials,
      activeCredentials,
      revokedCredentials,
      sbtMinted,
      onChainRegistered,
      sbtPending,
      registryPending,
    },
    credentialsByType,
    recentCredentials: items.slice(0, 5),
  }
}

export function deriveDidState(resolution, onChainStatus) {
  if (!resolution) {
    return {
      status: 'missing',
      did: null,
      message: null,
      onChainRegistered: null,
    }
  }

  const did = resolution?.didDocument?.id || null
  const error = resolution?.didResolutionMetadata?.error
  const deactivated = resolution?.didDocumentMetadata?.deactivated === true
  const onChainRegistered =
    onChainStatus == null
      ? null
      : typeof onChainStatus.active === 'boolean'
        ? true
        : Boolean(onChainStatus.did || onChainStatus.controller)

  if (deactivated || onChainStatus?.active === false || error === 'DID is deactivated on-chain') {
    return {
      status: 'deactivated',
      did,
      message: error || 'This DID is deactivated on-chain.',
      onChainRegistered,
    }
  }

  if (error) {
    return {
      status: 'warning',
      did,
      message: error,
      onChainRegistered,
    }
  }

  return {
    status: 'healthy',
    did,
    message: null,
    onChainRegistered,
  }
}
