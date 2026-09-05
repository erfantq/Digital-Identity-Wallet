import { MaterialIcon } from '@/components/landing/MaterialIcon'

export function AdminTopBar({ onMenuClick, drawerOpen = false }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <button
          type="button"
          className="admin-topbar__menu-btn"
          onClick={onMenuClick}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
        >
          <MaterialIcon name={drawerOpen ? 'close' : 'menu'} />
        </button>
        <span className="admin-topbar__mobile-title">FUM Wallet</span>
      </div>

      <div className="admin-topbar__spacer" aria-hidden="true" />

      <div className="admin-topbar__actions">
        <button type="button" className="admin-topbar__icon-btn" aria-label="Notifications">
          <MaterialIcon name="notifications" />
        </button>
        <div className="admin-topbar__avatar" aria-hidden="true">
          <MaterialIcon name="person" />
        </div>
      </div>
    </header>
  )
}
