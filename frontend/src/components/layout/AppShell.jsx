import { NavLink, Outlet, Link } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/hooks/useAuth'
import { formatRoleLabel } from '@/utils/roles'

export function AppShell({ title, navItems }) {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <BrandLogo className="app-shell__logo" size={40} alt="" />
          <div>
            <p className="app-shell__product">FUM Wallet</p>
            <h1 className="app-shell__title">{title}</h1>
          </div>
        </div>

        <div className="app-shell__meta">
          {user ? (
            <>
              <div className="app-shell__user">
                <span className="app-shell__username">{user.username}</span>
                <span className="app-shell__role">{formatRoleLabel(user.role)}</span>
              </div>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn--ghost">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div className="app-shell__body">
        <nav className="app-shell__nav" aria-label="Section navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-shell__nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
