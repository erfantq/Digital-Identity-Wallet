import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import { getDefaultRouteForRole } from '@/utils/roles'

/**
 * Login page.
 * Endpoints: POST /auth/login
 *
 * UI-only (no backend): Forgot Password?, Contact IT Support
 */
export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Login - FUM Wallet'
  }, [])

  const redirectPath =
    location.state?.from ?? (user ? getDefaultRouteForRole(user.role) : '/wallet')

  if (isAuthenticated && user) {
    return <Navigate to={redirectPath} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const nextUser = await login(username.trim(), password)
      navigate(getDefaultRouteForRole(nextUser.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="login-card">
          <div className="login-card__brand">
            <BrandLogo className="login-card__logo" size={64} alt="University Logo" />
            <h1 className="login-card__title">FUM Wallet</h1>
            <p className="login-card__subtitle">Secure Institutional Access</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-field__label" htmlFor="username">
                Username
              </label>
              <div className="login-field__control">
                <MaterialIcon name="person" className="login-field__icon login-field__icon--start" size={20} />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your Student ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field__label-row">
                <label className="login-field__label" htmlFor="password">
                  Password
                </label>
                <a className="login-link" href="#forgot-password">
                  Forgot Password?
                </a>
              </div>
              <div className="login-field__control">
                <MaterialIcon name="lock" className="login-field__icon login-field__icon--start" size={20} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="login-field__input--with-toggle"
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            {error && (
              <p className="login-form__error" role="alert">
                {error}
              </p>
            )}

            <div className="login-form__actions">
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
                {!loading && <MaterialIcon name="arrow_forward" size={20} />}
              </button>
            </div>
          </form>

          <div className="login-card__support login-card__support--in-card">
            <p>
              Need help?{' '}
              <a className="login-link" href="#support">
                Contact IT Support
              </a>
            </p>
          </div>
        </div>

        <footer className="login-page__footer">
          <p>
            Need assistance?
            <br className="login-page__footer-break" />{' '}
            <a className="login-link" href="#support">
              Contact IT Support
            </a>
          </p>
          <p className="login-page__home">
            <Link to="/">Back to home</Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
