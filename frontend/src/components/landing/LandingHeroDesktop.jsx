import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'
import { LANDING_IMAGES } from './landingAssets'

export function LandingHeroDesktop() {
  return (
    <section className="landing-hero landing-hero--desktop">
      <div className="landing-hero__bg" aria-hidden="true">
        <img src={LANDING_IMAGES.heroCampus} alt="" className="landing-hero__bg-image" />
        <div className="landing-hero__bg-gradient" />
      </div>

      <div className="landing-container landing-hero__grid">
        <div className="landing-hero__content">
          <div className="landing-badge">
            <MaterialIcon name="verified" size={16} />
            Official University Registrar Platform
          </div>

          <h1 className="landing-hero__title">
            Secure Digital Credentials for our University Community.
          </h1>

          <p className="landing-hero__lead">
            Access, verify, and share your academic achievements with uncompromising security. The
            modern standard for institutional identity.
          </p>

          <div className="landing-hero__actions">
            <Link to="/login" className="landing-btn landing-btn--primary">
              Access Your Wallet
              <MaterialIcon name="arrow_forward" />
            </Link>
            <a href="#learn" className="landing-btn landing-btn--secondary">
              Learn More
            </a>
          </div>
        </div>

        <div className="landing-hero__visual" aria-hidden="true">
          <img
            src={LANDING_IMAGES.heroWallet}
            alt=""
            className="landing-hero__visual-image"
          />
        </div>
      </div>
    </section>
  )
}
