import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminMobileDrawer, AdminSidebar } from '@/features/admin/AdminSidebar'
import { AdminTopBar } from '@/features/admin/AdminTopBar'

export function AdminPortalLayout({
  navItems,
  subtitle,
  ariaLabel,
  mobileAriaLabel,
  brandAlt,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="admin-portal">
      <AdminSidebar
        className="admin-portal__sidebar"
        navItems={navItems}
        subtitle={subtitle}
        ariaLabel={ariaLabel}
        brandAlt={brandAlt}
      />
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        subtitle={subtitle}
        ariaLabel={mobileAriaLabel}
        brandAlt={brandAlt}
      />

      <div className="admin-portal__main">
        <AdminTopBar
          drawerOpen={drawerOpen}
          onMenuClick={() => setDrawerOpen((open) => !open)}
        />
        <div className="admin-portal__content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
