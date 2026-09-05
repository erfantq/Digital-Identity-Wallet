import { MaterialIcon } from './MaterialIcon'
import { LANDING_IMAGES, MOBILE_FEATURES } from './landingAssets'

export function LandingFeaturesMobile() {
  return (
    <section className="landing-features-mobile" aria-label="Features">
      {MOBILE_FEATURES.map((feature) => (
        <article key={feature.title} className="landing-feature-card landing-feature-card--mobile">
          <div className="landing-feature-card__icon landing-feature-card__icon--round">
            <MaterialIcon name={feature.icon} />
          </div>
          <h3 className="landing-feature-card__title">{feature.title}</h3>
          <p className="landing-feature-card__body">{feature.description}</p>
        </article>
      ))}
    </section>
  )
}

export function LandingFeaturesDesktop() {
  return (
    <section className="landing-features-desktop" id="learn">
      <div className="landing-container">
        <div className="landing-section-heading">
          <h2 className="landing-section-heading__title">Enterprise-Grade Identity</h2>
          <p className="landing-section-heading__lead">
            Built on open standards to ensure your academic records are universally recognized and
            cryptographically secure.
          </p>
        </div>

        <div className="landing-bento">
          <article className="landing-feature-card landing-feature-card--wide">
            <div>
              <div className="landing-feature-card__icon landing-feature-card__icon--square landing-feature-card__icon--primary">
                <MaterialIcon name="shield_person" filled />
              </div>
              <h3 className="landing-feature-card__title">Self-Sovereign Identity</h3>
              <p className="landing-feature-card__body">
                You own your data. FUM Wallet empowers students and alumni with complete control
                over their digital credentials. Share only what is necessary, when it is necessary,
                without relying on central authorities for verification.
              </p>
            </div>
            <div className="landing-feature-card__footer">
              <span>W3C Standard Compliant</span>
              <MaterialIcon name="check_circle" className="landing-feature-card__footer-icon" />
            </div>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-card__icon landing-feature-card__icon--square landing-feature-card__icon--secondary">
              <MaterialIcon name="handshake" filled />
            </div>
            <h3 className="landing-feature-card__title">Instant Trust</h3>
            <p className="landing-feature-card__body">
              Employers and institutions can verify your credentials instantly using cryptographic
              signatures, eliminating lengthy background checks and manual transcript requests.
            </p>
          </article>

          <article className="landing-feature-card landing-feature-card--banner">
            <div className="landing-feature-card__banner-content">
              <div className="landing-badge landing-badge--success">
                <MaterialIcon name="how_to_reg" size={16} />
                Anchored to Blockchain
              </div>
              <h3 className="landing-feature-card__title">Verifiable Degrees &amp; Transcripts</h3>
              <p className="landing-feature-card__body">
                Your diploma, transcript, and continuing education certificates are issued as
                Verifiable Credentials (VCs). These tamper-evident digital records are mathematically
                proven to be authentic and issued directly by the university registrar.
              </p>
              <a href="#learn" className="landing-link">
                View Technical Specs
                <MaterialIcon name="arrow_forward" className="landing-link__arrow" />
              </a>
            </div>
            <div className="landing-feature-card__banner-media">
              <img src={LANDING_IMAGES.transcriptMonitor} alt="" />
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
