import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { deleteAdmin, getAdminDetail, listAdmins } from '@/api/auth'
import { authorizeIssuer, revokeIssuer } from '@/api/trust'
import { ApiError } from '@/api/client'
import {
  AdminAddShortcut,
  AdminManagementDetail,
  AdminManagementFilters,
  AdminManagementPagination,
  AdminManagementTable,
  DeleteAdminModal,
} from '@/components/admin/AdminManagementPanel'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/utils/roles'

const PAGE_SIZE = 15

/**
 * Super-admin Admin Management page.
 * Endpoints:
 * - GET /auth/admins
 * - GET /auth/admins/{user_id}
 * - DELETE /auth/admins/{user_id}
 * - POST /trusted-entities/authorize
 * - POST /trusted-entities/revoke
 */
export function AdminAdminsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    document.title = 'FUM Wallet - Admin Management'
  }, [])

  const fetchAdmins = useCallback(async (targetPage, nextSearch) => {
    setListLoading(true)
    setListError(null)

    try {
      const data = await listAdmins({
        page: targetPage,
        pageSize: PAGE_SIZE,
        search: nextSearch,
      })
      setItems(data.items || [])
      setPagination(data.pagination || null)
      setPage(targetPage)
    } catch (err) {
      setItems([])
      setPagination(null)
      setListError(err instanceof ApiError ? err.message : 'Failed to load admins.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSuperAdmin(user?.role)) return
    fetchAdmins(page, appliedSearch)
  }, [page, appliedSearch, fetchAdmins, user?.role])

  const loadAdminDetail = useCallback(async (userId) => {
    if (!userId) {
      setSelectedAdmin(null)
      setDetailError(null)
      return
    }

    setDetailLoading(true)
    setDetailError(null)
    setActionError(null)

    try {
      const data = await getAdminDetail(userId)
      setSelectedAdmin(data)
    } catch (err) {
      setSelectedAdmin(null)
      setDetailError(err instanceof ApiError ? err.message : 'Failed to load admin details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  if (!isSuperAdmin(user?.role)) {
    return <Navigate to="/admin" replace />
  }

  function handleApplyFilters(event) {
    event.preventDefault()
    setSelectedUserId(null)
    setSelectedAdmin(null)
    setAppliedSearch(search.trim())
    setPage(1)
  }

  function handleSelectAdmin(userId) {
    setSelectedUserId(userId)
    loadAdminDetail(userId)
  }

  function handleCloseDetail() {
    setSelectedUserId(null)
    setSelectedAdmin(null)
    setDetailError(null)
    setActionError(null)
  }

  async function refreshSelected(userId) {
    await fetchAdmins(page, appliedSearch)
    if (userId) await loadAdminDetail(userId)
  }

  async function handleAuthorize() {
    if (!selectedAdmin?.eth_address || actionLoading) return
    setActionLoading(true)
    setActionError(null)

    try {
      await authorizeIssuer(selectedAdmin.eth_address)
      await refreshSelected(selectedAdmin.user_id)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to authorize issuer.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRevoke() {
    if (!selectedAdmin?.eth_address || actionLoading) return
    setActionLoading(true)
    setActionError(null)

    try {
      await revokeIssuer(selectedAdmin.eth_address)
      await refreshSelected(selectedAdmin.user_id)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to revoke issuer.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || actionLoading) return
    setActionLoading(true)
    setActionError(null)

    try {
      await deleteAdmin(deleteTarget.user_id)
      setDeleteTarget(null)
      handleCloseDetail()
      await fetchAdmins(page, appliedSearch)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete admin.')
      setDeleteTarget(null)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="user-dir admin-mgmt">
      <header className="user-dir__page-header">
        <h1>Admin Management</h1>
        <p>List admins, inspect issuer authorization, and authorize or revoke them on-chain.</p>
      </header>

      <AdminManagementFilters
        search={search}
        loading={listLoading}
        onSearchChange={setSearch}
        onSubmit={handleApplyFilters}
        onAddAdmin={() => navigate('/admin/users')}
      />
      <AdminAddShortcut />

      {listError && (
        <div className="user-dir__error-banner" role="alert">
          {listError}
        </div>
      )}

      <div className={`user-dir__layout${selectedUserId ? ' user-dir__layout--detail-open' : ''}`}>
        <section className="user-dir__list-panel">
          <AdminManagementTable
            items={items}
            selectedUserId={selectedUserId}
            onSelect={handleSelectAdmin}
            loading={listLoading}
          />
          <AdminManagementPagination
            pagination={pagination}
            onPageChange={setPage}
            loading={listLoading}
          />
        </section>

        <AdminManagementDetail
          admin={selectedAdmin}
          loading={detailLoading}
          error={detailError}
          actionError={actionError}
          actionLoading={actionLoading}
          onClose={handleCloseDetail}
          onAuthorize={handleAuthorize}
          onRevoke={handleRevoke}
          onDelete={() => setDeleteTarget(selectedAdmin)}
        />
      </div>

      {deleteTarget && (
        <DeleteAdminModal
          admin={deleteTarget}
          loading={actionLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
