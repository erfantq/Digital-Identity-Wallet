import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { MaterialIcon } from './MaterialIcon'

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link to="/" className="landing-header__brand">
          <BrandLogo className="landing-header__brand-logo" size={36} />
          <span className="landing-header__brand-text landing-header__brand-text--full">
            FUM Wallet
          </span>
          <span className="landing-header__brand-text landing-header__brand-text--short">FUM</span>
        </Link>

        <Link to="/login" className="landing-header__login landing-header__login--desktop">
          Login
          <MaterialIcon name="login" size={18} />
        </Link>

        <button
          type="button"
          className="landing-header__menu-btn landing-header__login--mobile"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MaterialIcon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>

      {menuOpen && (
        <nav className="landing-header__mobile-nav" aria-label="Mobile navigation">
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/verify" onClick={() => setMenuOpen(false)}>
            Verify credential
          </Link>
        </nav>
      )}
    </header>
  )
}
