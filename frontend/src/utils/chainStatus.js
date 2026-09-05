export function deriveCredentialChainStatus(credential, onChainRegistered, sbtMinted) {
  if (credential.status === 'revoked') {
    if (credential.revoke_tx_hash || credential.sbt_revoke_tx_hash) return 'revoked'
    return 'confirming'
  }

  if (sbtMinted || credential.sbt_token_id != null) return 'minted'
  if (onChainRegistered || credential.sbt_tx_hash) return 'confirming'
  return 'pending'
}

export function deriveDidChainStatus(record) {
  if (!record) return 'pending'

  const exists =
    record.exists ??
    record.registered ??
    record.isRegistered ??
    (typeof record.active === 'boolean' ? record.active : undefined)
  const deactivated =
    record.deactivated ??
    record.isDeactivated ??
    (typeof record.active === 'boolean' ? !record.active : undefined)

  if (deactivated === true) return 'revoked'
  if (exists === false) return 'pending'
  if (exists === true) return 'anchored'

  return 'unknown'
}

export function chainStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'confirming':
      return 'Confirming'
    case 'anchored':
      return 'Anchored'
    case 'minted':
      return 'Minted'
    case 'revoked':
      return 'Revoked'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

export function chainStatusDescription(status) {
  switch (status) {
    case 'pending':
      return 'Saved locally. Waiting for blockchain worker.'
    case 'confirming':
      return 'Transaction submitted. Waiting for on-chain confirmation.'
    case 'anchored':
      return 'Confirmed on-chain.'
    case 'minted':
      return 'Certificate SBT mint confirmed on-chain.'
    case 'revoked':
      return 'Revocation confirmed on-chain.'
    case 'failed':
      return 'On-chain operation failed. Retry or contact support.'
    default:
      return 'Status unavailable.'
  }
}
