import { NavLink, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import { getAdminNavItems } from '@/features/admin/adminNav'
import { isSuperAdmin } from '@/utils/roles'

function defaultAdminSubtitle(role) {
  return isSuperAdmin(role) ? 'Super Admin Portal' : 'Admin Portal'
}

export function AdminSidebar({
  className = '',
  navItems,
  subtitle,
  ariaLabel = 'Admin navigation',
  brandAlt = 'FUM Wallet Logo',
}) {
  const { logout, user } = useAuth()
  const items = navItems ?? getAdminNavItems(user?.role)
  const resolvedSubtitle = subtitle ?? defaultAdminSubtitle(user?.role)

  return (
    <aside className={`admin-sidebar ${className}`.trim()}>
      <div className="admin-sidebar__brand">
        <BrandLogo className="admin-sidebar__logo" size={48} alt={brandAlt} />
        <div>
          <h1 className="admin-sidebar__title">FUM Wallet</h1>
          <p className="admin-sidebar__subtitle">{resolvedSubtitle}</p>
        </div>
      </div>

      <nav className="admin-sidebar__nav" aria-label={ariaLabel}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
            }
          >
            <MaterialIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button type="button" className="admin-sidebar__link admin-sidebar__link--button" onClick={logout}>
          <MaterialIcon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export function AdminMobileDrawer({
  open,
  onClose,
  navItems,
  subtitle,
  ariaLabel = 'Mobile admin navigation',
  brandAlt = 'FUM Wallet Logo',
}) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const items = navItems ?? getAdminNavItems(user?.role)
  const resolvedSubtitle = subtitle ?? defaultAdminSubtitle(user?.role)

  function handleNavClick() {
    onClose()
  }

  function handleLogout() {
    onClose()
    logout()
    navigate('/login')
  }

  return (
    <>
      <div
        className={`admin-drawer-overlay${open ? ' admin-drawer-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        className={`admin-drawer${open ? ' admin-drawer--open' : ''}`}
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        <div className="admin-drawer__header">
          <div className="admin-sidebar__brand admin-sidebar__brand--compact">
            <BrandLogo className="admin-sidebar__logo" size={32} alt={brandAlt} />
            <div>
              <h2 className="admin-sidebar__title">FUM Wallet</h2>
              <p className="admin-sidebar__subtitle">{resolvedSubtitle}</p>
            </div>
          </div>
          <button type="button" className="admin-topbar__icon-btn" onClick={onClose} aria-label="Close menu">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="admin-drawer__nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `admin-sidebar__link admin-sidebar__link--drawer${isActive ? ' admin-sidebar__link--active' : ''}`
              }
            >
              <MaterialIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="admin-drawer__footer">
          <button
            type="button"
            className="admin-sidebar__link admin-sidebar__link--drawer admin-sidebar__link--button"
            onClick={handleLogout}
          >
            <MaterialIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  )
}
