import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserDetail, listUsers } from '@/api/auth'
import { ApiError } from '@/api/client'
import {
  UserDirectoryDetail,
  UserDirectoryFilters,
  UserDirectoryPagination,
  UserDirectoryTable,
} from '@/components/admin/UserDirectoryPanel'

const PAGE_SIZE = 15

/**
 * Admin user directory page.
 * Endpoints: GET /auth/users, GET /auth/users/{user_id}
 */
export function AdminUserDirectoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedRole, setAppliedRole] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  useEffect(() => {
    document.title = 'FUM Wallet - All Users'
  }, [])

  const fetchUsers = useCallback(async (targetPage, nextSearch, nextRole) => {
    setListLoading(true)
    setListError(null)

    try {
      const data = await listUsers({
        page: targetPage,
        pageSize: PAGE_SIZE,
        search: nextSearch,
        role: nextRole,
      })
      setItems(data.items || [])
      setPagination(data.pagination || null)
      setPage(targetPage)
    } catch (err) {
      setItems([])
      setPagination(null)
      setListError(err instanceof ApiError ? err.message : 'Failed to load users.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page, appliedSearch, appliedRole)
  }, [page, appliedSearch, appliedRole, fetchUsers])

  const loadUserDetail = useCallback(async (userId) => {
    if (!userId) {
      setSelectedUser(null)
      setDetailError(null)
      return
    }

    setDetailLoading(true)
    setDetailError(null)

    try {
      const data = await getUserDetail(userId)
      setSelectedUser(data)
    } catch (err) {
      setSelectedUser(null)
      setDetailError(err instanceof ApiError ? err.message : 'Failed to load user details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    const prefillUserId = location.state?.userId
    const prefillUsername = location.state?.username

    if (prefillUserId == null && typeof prefillUsername !== 'string') return

    if (typeof prefillUsername === 'string' && prefillUsername.trim()) {
      const trimmed = prefillUsername.trim()
      setSearch(trimmed)
      setAppliedSearch(trimmed)
      setRole('')
      setAppliedRole('')
      setPage(1)
    }

    if (prefillUserId != null) {
      const userId = Number(prefillUserId)
      if (!Number.isNaN(userId)) {
        setSelectedUserId(userId)
        loadUserDetail(userId)
      }
    }

    navigate('/admin/directory', { replace: true, state: {} })
  }, [location.state, loadUserDetail, navigate])

  function handleApplyFilters(event) {
    event.preventDefault()
    setSelectedUserId(null)
    setSelectedUser(null)
    setAppliedSearch(search.trim())
    setAppliedRole(role)
    setPage(1)
  }

  function handleSelectUser(userId) {
    setSelectedUserId(userId)
    loadUserDetail(userId)
  }

  function handleCloseDetail() {
    setSelectedUserId(null)
    setSelectedUser(null)
    setDetailError(null)
  }

  return (
    <div className="user-dir">
      <header className="user-dir__page-header">
        <h1>All Users</h1>
        <p>Browse every account in the system and inspect wallet, role, and DID details.</p>
      </header>

      <UserDirectoryFilters
        search={search}
        role={role}
        loading={listLoading}
        onSearchChange={setSearch}
        onRoleChange={setRole}
        onSubmit={handleApplyFilters}
      />

      {listError && (
        <div className="user-dir__error-banner" role="alert">
          {listError}
        </div>
      )}

      <div className={`user-dir__layout${selectedUserId ? ' user-dir__layout--detail-open' : ''}`}>
        <section className="user-dir__list-panel">
          <UserDirectoryTable
            items={items}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            loading={listLoading}
          />
          <UserDirectoryPagination
            pagination={pagination}
            onPageChange={setPage}
            loading={listLoading}
          />
        </section>

        <UserDirectoryDetail
          user={selectedUser}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseDetail}
        />
      </div>
    </div>
  )
}
