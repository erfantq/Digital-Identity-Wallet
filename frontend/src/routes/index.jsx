import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleRoute } from '@/components/RoleRoute'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { VerifierLayout } from '@/features/verifier/VerifierLayout'
import { WalletLayout } from '@/features/wallet/WalletLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SessionExpiredPage } from '@/pages/SessionExpiredPage'
import { AdminAdminsPage } from '@/pages/admin/AdminAdminsPage'
import { AdminCredentialsPage } from '@/pages/admin/AdminCredentialsPage'
import { AdminDidsPage } from '@/pages/admin/AdminDidsPage'
import { AdminHomePage } from '@/pages/admin/AdminHomePage'
import { AdminIssuePage } from '@/pages/admin/AdminIssuePage'
import { AdminTrustPage } from '@/pages/admin/AdminTrustPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminUserDirectoryPage } from '@/pages/admin/AdminUserDirectoryPage'
import { VerifierPage } from '@/pages/verifier/VerifierPage'
import { WalletCredentialsPage } from '@/pages/wallet/WalletCredentialsPage'
import { WalletDidPage } from '@/pages/wallet/WalletDidPage'
import { WalletHomePage } from '@/pages/wallet/WalletHomePage'
import { WalletResolveDidPage } from '@/pages/wallet/WalletResolveDidPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/session-expired" element={<SessionExpiredPage />} />
      <Route path="/verify" element={<VerifierLayout />}>
        <Route index element={<VerifierPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['user', 'student', 'teacher']} />}>
          <Route path="/wallet" element={<WalletLayout />}>
            <Route index element={<WalletHomePage />} />
            <Route path="credentials" element={<WalletCredentialsPage />} />
            <Route path="did" element={<WalletDidPage />} />
            <Route path="resolve" element={<WalletResolveDidPage />} />
            <Route path="verify" element={<VerifierPage embedded />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={['admin', 'super_admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="directory" element={<AdminUserDirectoryPage />} />
            <Route path="dids" element={<AdminDidsPage />} />
            <Route path="issue" element={<AdminIssuePage />} />
            <Route path="credentials" element={<AdminCredentialsPage />} />
            <Route path="verify" element={<VerifierPage embedded />} />
            <Route path="admins" element={<AdminAdminsPage />} />
            {/* <Route path="trust" element={<AdminTrustPage />} /> */}
          </Route>
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
