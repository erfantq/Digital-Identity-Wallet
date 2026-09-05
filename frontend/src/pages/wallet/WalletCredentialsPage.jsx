import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCertificateSbtStatus,
  getCredentialOnChainStatus,
  listAuthUserCredentials,
} from '@/api/credentials'
import { ApiError } from '@/api/client'
import {
  CredentialJsonModal,
  CredentialsCards,
  CredentialsEmptyResults,
  CredentialsErrorState,
  CredentialsNoDidState,
  CredentialsPagination,
  CredentialsTable,
} from '@/components/admin/UserCredentialsPanel'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import '@/styles/user-credentials.css'

const PAGE_SIZE = 10

/**
 * Wallet My Credentials page.
 * Endpoints:
 * - GET /credentials/users/auth/credentials
 * - GET /credentials/on-chain/status
 * - GET /credentials/on-chain/sbt
 */
export function WalletCredentialsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading')
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)
  const [noDid, setNoDid] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [jsonModalItem, setJsonModalItem] = useState(null)
  const [chainLoadingId, setChainLoadingId] = useState(null)
  const [chainInfoById, setChainInfoById] = useState({})
  const [chainMessage, setChainMessage] = useState(null)

  useEffect(() => {
    document.title = 'FUM Wallet - My Credentials'
  }, [])

  const fetchCredentials = useCallback(async (targetPage = 1) => {
    setPhase('loading')
    setError(null)
    setNoDid(false)
    setExpandedId(null)
    setChainMessage(null)

    try {
      const data = await listAuthUserCredentials(targetPage, PAGE_SIZE)
      setItems(data.items || [])
      setPagination(data.pagination || null)
      setPage(targetPage)
      setPhase('loaded')
    } catch (err) {
      setItems([])
      setPagination(null)
      if (err instanceof ApiError && err.status === 404) {
        setNoDid(true)
        setPhase('loaded')
        setError(null)
      } else {
        setPhase('error')
        setError(err instanceof ApiError ? err.message : 'Failed to load credentials.')
      }
    }
  }, [])

  useEffect(() => {
    fetchCredentials(1)
  }, [fetchCredentials])

  function handleToggleJson(item) {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setJsonModalItem((current) => (current?.credential_id === item.credential_id ? null : item))
      return
    }
    setExpandedId((current) => (current === item.credential_id ? null : item.credential_id))
  }

  async function handleCheckChain(item) {
    if (chainLoadingId) return

    setChainLoadingId(item.credential_id)
    setChainMessage(null)

    try {
      let registryRegistered = Boolean(item.tx_hash)
      let sbtMinted = item.sbt_token_id != null
      const notes = []

      try {
        const registry = await getCredentialOnChainStatus(item.credential_id)
        registryRegistered = Boolean(registry?.credential_hash || registry?.issuer)
        notes.push(
          registry?.revoked
            ? 'Registry: revoked on-chain'
            : registryRegistered
              ? 'Registry: anchored on-chain'
              : 'Registry: not found',
        )
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
          registryRegistered = Boolean(item.tx_hash)
          notes.push(item.tx_hash ? 'Registry: local tx present' : 'Registry: not found on-chain')
        } else {
          throw err
        }
      }

      try {
        const sbt = await getCertificateSbtStatus(item.credential_id)
        sbtMinted = sbt?.token_id != null
        notes.push(
          sbt?.revoked
            ? 'SBT: revoked on-chain'
            : sbtMinted
              ? `SBT: minted (#${sbt.token_id})`
              : 'SBT: not minted',
        )
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
          sbtMinted = item.sbt_token_id != null
          notes.push(sbtMinted ? 'SBT: local mint recorded' : 'SBT: not found on-chain')
        } else {
          throw err
        }
      }

      setChainInfoById((prev) => ({
        ...prev,
        [item.credential_id]: { registryRegistered, sbtMinted },
      }))
      setChainMessage({
        tone: 'ok',
        text: `${item.type}: ${notes.join(' · ')}`,
      })
    } catch (err) {
      setChainMessage({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to check on-chain status.',
      })
    } finally {
      setChainLoadingId(null)
    }
  }

  const showLoading = phase === 'loading'
  const showError = phase === 'error'
  const showLoaded = phase === 'loaded'

  return (
    <div className="user-creds wallet-creds">
      <header className="user-creds__page-header wallet-creds__header">
        <div>
          <h1>My Credentials</h1>
          <p>
            Verifiable credentials issued to your wallet
            {user?.username ? ` (@${user.username})` : ''}.
          </p>
        </div>
        <button
          type="button"
          className="user-creds__page-btn wallet-creds__refresh"
          onClick={() => fetchCredentials(page)}
          disabled={showLoading}
        >
          <MaterialIcon name="refresh" size={18} />
          {showLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {chainMessage && (
        <div
          className={`wallet-creds__banner wallet-creds__banner--${chainMessage.tone}`}
          role="status"
        >
          <MaterialIcon
            name={chainMessage.tone === 'error' ? 'error' : 'hub'}
            size={20}
            filled={chainMessage.tone === 'error'}
          />
          <p>{chainMessage.text}</p>
          <button
            type="button"
            className="wallet-creds__banner-dismiss"
            onClick={() => setChainMessage(null)}
            aria-label="Dismiss"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
      )}

      {showLoading && (
        <section className="user-creds__loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Loading your credentials…</p>
        </section>
      )}

      {showError && (
        <CredentialsErrorState message={error} onRetry={() => fetchCredentials(1)} />
      )}

      {showLoaded && noDid && (
        <CredentialsNoDidState onGoToDid={() => navigate('/wallet/did')} />
      )}

      {showLoaded && !noDid && (
        <>
          <div className="user-creds__results-header">
            <p>
              Showing your credentials ({pagination?.total_items ?? items.length}{' '}
              {(pagination?.total_items ?? items.length) === 1 ? 'item' : 'items'} found)
            </p>
          </div>

          {items.length === 0 ? (
            <CredentialsEmptyResults
              title="No credentials yet"
              message="You do not have any issued credentials in your wallet yet."
            />
          ) : (
            <>
              <CredentialsTable
                items={items}
                expandedId={expandedId}
                onToggleJson={handleToggleJson}
                allowRevoke={false}
                onCheckChain={handleCheckChain}
                chainLoadingId={chainLoadingId}
                chainInfoById={chainInfoById}
                showChainStatus
              />
              <CredentialsCards
                items={items}
                onViewJson={handleToggleJson}
                allowRevoke={false}
                onCheckChain={handleCheckChain}
                chainLoadingId={chainLoadingId}
                chainInfoById={chainInfoById}
                showChainStatus
              />
              <CredentialsPagination
                pagination={pagination}
                loading={showLoading}
                onPageChange={(nextPage) => fetchCredentials(nextPage)}
              />
            </>
          )}
        </>
      )}

      {jsonModalItem && (
        <CredentialJsonModal item={jsonModalItem} onClose={() => setJsonModalItem(null)} />
      )}
    </div>
  )
}
