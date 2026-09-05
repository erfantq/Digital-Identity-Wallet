import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'

export function LandingHeroMobile() {
  return (
    <section className="landing-hero landing-hero--mobile">
      <div className="landing-hero-mobile__icon-wrap">
        <MaterialIcon name="wallet" filled size={64} className="landing-hero-mobile__icon" />
      </div>

      <h1 className="landing-hero-mobile__title">Secure Digital Credentials.</h1>

      <p className="landing-hero-mobile__lead">
        Access campus services, verify your identity, and manage your digital wallet instantly.
      </p>

      <Link to="/login" className="landing-btn landing-btn--primary landing-btn--block">
        Get Started
      </Link>
    </section>
  )
}
