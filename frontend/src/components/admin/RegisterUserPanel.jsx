import { useState } from 'react'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { formatRoleLabel } from '@/utils/roles'

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  role: '',
}

export { EMPTY_FORM }

export function RegisterUserForm({
  form,
  fieldErrors,
  globalError,
  loading,
  roleOptions = [],
  onChange,
  onSubmit,
  onCancel,
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="register-user__form-card">
      {globalError && (
        <div className="register-user__banner register-user__banner--error" role="alert">
          <MaterialIcon name="error" filled className="register-user__banner-icon" />
          <div>
            <h3>Registration Failed</h3>
            <p>{globalError}</p>
          </div>
        </div>
      )}

      <form className="register-user__form" onSubmit={onSubmit} noValidate>
        <div className="register-user__field">
          <label className="register-user__label" htmlFor="register-username">
            Username
          </label>
          <div className="register-user__input-wrap">
            <MaterialIcon
              name="person"
              size={20}
              className={`register-user__input-icon register-user__input-icon--mobile${fieldErrors.username ? ' register-user__input-icon--error' : ''}`}
            />
            <input
              id="register-username"
              name="username"
              type="text"
              className={`register-user__input${fieldErrors.username ? ' register-user__input--error' : ''}`}
              placeholder="e.g. j.doe"
              value={form.username}
              onChange={onChange}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'register-username-error' : undefined}
              autoComplete="off"
            />
            {fieldErrors.username && (
              <MaterialIcon name="warning" filled size={20} className="register-user__input-warning" />
            )}
          </div>
          {fieldErrors.username && (
            <p id="register-username-error" className="register-user__field-error">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="register-user__field">
          <label className="register-user__label register-user__label--split" htmlFor="register-email">
            <span>Email</span>
            <span className="register-user__optional">Optional</span>
          </label>
          <div className="register-user__input-wrap">
            <MaterialIcon name="mail" size={20} className="register-user__input-icon register-user__input-icon--mobile" />
            <input
              id="register-email"
              name="email"
              type="email"
              className={`register-user__input${fieldErrors.email ? ' register-user__input--error' : ''}`}
              placeholder="j.doe@fum.edu"
              value={form.email}
              onChange={onChange}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              autoComplete="off"
            />
          </div>
          {fieldErrors.email && (
            <p id="register-email-error" className="register-user__field-error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="register-user__field">
          <label className="register-user__label" htmlFor="register-password">
            Password
          </label>
          <div className="register-user__input-wrap">
            <MaterialIcon name="lock" size={20} className="register-user__input-icon register-user__input-icon--mobile" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="register-user__input register-user__input--password"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="register-user__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <MaterialIcon name={showPassword ? 'visibility' : 'visibility_off'} size={20} />
            </button>
          </div>
        </div>

        <div className="register-user__field">
          <label className="register-user__label" htmlFor="register-role">
            Role
          </label>
          <div className="register-user__input-wrap register-user__input-wrap--select">
            <MaterialIcon
              name="manage_accounts"
              size={20}
              className="register-user__input-icon register-user__input-icon--mobile register-user__input-icon--select"
            />
            <select
              id="register-role"
              name="role"
              className={`register-user__input register-user__input--select${fieldErrors.role ? ' register-user__input--error' : ''}`}
              value={form.role}
              onChange={onChange}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.role)}
            >
              <option value="" disabled>
                Select a role
              </option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialIcon name="expand_more" size={20} className="register-user__select-chevron" />
          </div>
          {fieldErrors.role && <p className="register-user__field-error">{fieldErrors.role}</p>}
        </div>

        <div className="register-user__actions">
          <button type="button" className="register-user__btn register-user__btn--secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="register-user__btn register-user__btn--primary" disabled={loading}>
            <MaterialIcon name="person_add" size={18} />
            {loading ? 'Registering…' : 'Register User'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function RegisterUserSuccess({
  result,
  message,
  onRegisterAnother,
  onViewProfile,
  onIssueCredential,
}) {
  const [copied, setCopied] = useState(false)

  async function copyEthAddress() {
    if (!result?.eth_address) return
    try {
      await navigator.clipboard.writeText(result.eth_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="register-user__success">
      <div className="register-user__banner register-user__banner--success" role="status">
        <MaterialIcon name="check_circle" filled className="register-user__banner-icon" />
        <div>
          <h2>Registration Successful</h2>
          <p>{message}</p>
        </div>
      </div>

      <div className="register-user__success-grid">
        <div className="register-user__details-card" id="user-details">
          <div className="register-user__details-header">
            <h3>
              <MaterialIcon name="badge" className="register-user__details-icon" />
              User Details
            </h3>
            <span className="register-user__status-badge">DID Provisioning</span>
          </div>

          <dl className="register-user__details-grid">
            <div>
              <dt>User ID</dt>
              <dd>{result.user_id}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{result.username}</dd>
            </div>
            <div>
              <dt>Email Address</dt>
              <dd className="register-user__detail-with-icon">
                <MaterialIcon name="mail" size={18} />
                {result.email || '—'}
              </dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd className="register-user__detail-with-icon">
                <MaterialIcon name="school" size={18} />
                {formatRoleLabel(result.role)}
              </dd>
            </div>
            <div className="register-user__details-full">
              <dt>ETH Address</dt>
              <dd className="register-user__eth-row">
                <MaterialIcon name="account_balance_wallet" size={20} />
                <code>{result.eth_address}</code>
                <button type="button" className="register-user__copy-btn" onClick={copyEthAddress} aria-label="Copy ETH address">
                  <MaterialIcon name={copied ? 'check' : 'content_copy'} size={20} />
                </button>
              </dd>
            </div>
          </dl>

          <div className="register-user__async-note">
            <MaterialIcon name="info" size={20} />
            <p>
              <strong>Note:</strong> DID provisioning is asynchronous — the user may need a moment before
              their decentralized identifier is fully available on the network.
            </p>
          </div>
        </div>

        <aside className="register-user__aside">
          <div className="register-user__next-steps">
            <h3>Next Steps</h3>
            <button type="button" className="register-user__next-btn register-user__next-btn--primary" onClick={onRegisterAnother}>
              <MaterialIcon name="person_add" />
              Register Another User
            </button>
            <button type="button" className="register-user__next-btn register-user__next-btn--outline" onClick={onViewProfile}>
              <MaterialIcon name="visibility" />
              View User Profile
            </button>
            <button type="button" className="register-user__next-btn register-user__next-btn--outline" onClick={onIssueCredential}>
              <MaterialIcon name="verified_user" />
              Issue Credential to User
            </button>
          </div>

          <div className="register-user__system-status">
            <h4>System Status</h4>
            <div className="register-user__system-online">
              <span className="register-user__pulse" aria-hidden="true" />
              <span>Network Connected</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
