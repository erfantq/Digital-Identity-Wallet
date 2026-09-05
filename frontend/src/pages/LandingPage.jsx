import { useEffect } from 'react'
import { LandingFeaturesDesktop, LandingFeaturesMobile } from '@/components/landing/LandingFeatures'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingHeroDesktop } from '@/components/landing/LandingHeroDesktop'
import { LandingHeroMobile } from '@/components/landing/LandingHeroMobile'

/**
 * Public marketing landing page.
 * Endpoints: none (navigation only → /login, /verify)
 */
export function LandingPage() {
  useEffect(() => {
    document.title = 'FUM Wallet'
    return () => {
      document.title = 'FUM Wallet'
    }
  }, [])

  return (
    <div className="landing-page">
      <LandingHeader />

      <main className="landing-main">
        <div className="landing-desktop-only">
          <LandingHeroDesktop />
          <LandingFeaturesDesktop />
        </div>

        <div className="landing-mobile-only landing-mobile-stack">
          <LandingHeroMobile />
          <LandingFeaturesMobile />
        </div>
      </main>

      <div className="landing-desktop-only">
        <LandingFooter />
      </div>
    </div>
  )
}
