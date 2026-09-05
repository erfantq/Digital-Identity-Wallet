import { AdminPortalLayout } from '@/features/admin/AdminPortalLayout'
import { WALLET_NAV_ITEMS } from '@/features/wallet/walletNav'

export function WalletLayout() {
  return (
    <AdminPortalLayout
      navItems={WALLET_NAV_ITEMS}
      subtitle="Wallet Portal"
      ariaLabel="Wallet navigation"
      mobileAriaLabel="Mobile wallet navigation"
      brandAlt="FUM Wallet Logo"
    />
  )
}
