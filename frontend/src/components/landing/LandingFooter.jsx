import { BrandLogo } from '@/components/BrandLogo'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer__inner">
        <div className="landing-footer__brand">
          <BrandLogo size={22} alt="" />
          <span>FUM Wallet © {year}</span>
        </div>
        <nav className="landing-footer__links" aria-label="Footer">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#support">Support</a>
        </nav>
      </div>
    </footer>
  )
}
