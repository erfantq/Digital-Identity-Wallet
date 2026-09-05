import { Outlet } from 'react-router-dom'
import { VerifyFooter, VerifyHeader } from '@/components/verifier/VerifyCredentialViews'

export function VerifierLayout() {
  return (
    <div className="verify-page">
      <VerifyHeader />
      <main className="verify-main">
        <Outlet />
      </main>
      <VerifyFooter />
    </div>
  )
}
