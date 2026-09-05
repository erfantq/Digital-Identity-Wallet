import { chainStatusDescription, chainStatusLabel } from '@/utils/chainStatus'

const STATUS_CLASS = {
  pending: 'status-badge--pending',
  confirming: 'status-badge--confirming',
  anchored: 'status-badge--anchored',
  minted: 'status-badge--minted',
  revoked: 'status-badge--revoked',
  failed: 'status-badge--failed',
  unknown: 'status-badge--unknown',
}

export function StatusBadge({ status, showDescription = false }) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status]}`} title={chainStatusDescription(status)}>
      {chainStatusLabel(status)}
      {showDescription && (
        <span className="status-badge__desc">{chainStatusDescription(status)}</span>
      )}
    </span>
  )
}
