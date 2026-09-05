import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import { getDefaultRouteForRole } from '@/utils/roles'
import {
  CHECK_GROUPS,
  FLAT_CHECKS,
  buildMobileSummary,
  checkState,
} from '@/utils/verifyCredential'

export function VerifyHeader() {
  const { isAuthenticated, user, isBootstrapping } = useAuth()
  const portalPath = user ? getDefaultRouteForRole(user.role) : '/wallet'

  return (
    <header className="verify-header">
      <div className="verify-header__inner">
        <Link to="/" className="verify-header__brand">
          <BrandLogo size={40} />
          <span className="verify-header__brand-text">FUM Wallet</span>
        </Link>

        <div className="verify-header__actions">
          {!isBootstrapping && (
            isAuthenticated && user ? (
              <Link to={portalPath} className="verify-header__connect">
                Go to Portal
              </Link>
            ) : (
              <Link to="/login" className="verify-header__login">
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}

export function VerifyFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="verify-footer">
      <div className="verify-footer__inner">
        <div className="verify-footer__brand-block">
          <span className="verify-footer__brand">FUM Wallet</span>
          <span className="verify-footer__copyright">
            © {year} FUM Wallet Institutional Registrar. All rights reserved.
          </span>
        </div>
        <nav className="verify-footer__links" aria-label="Footer">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#security">Security Audit</a>
        </nav>
      </div>
    </footer>
  )
}

export function VerifyCredentialForm({
  jsonText,
  onJsonChange,
  onFileLoad,
  onSubmit,
  loading,
  parseError,
}) {
  const fileInputRef = useRef(null)

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      onJsonChange(text)
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    onFileLoad(file)
    event.target.value = ''
  }

  return (
    <div className="verify-form">
      <header className="verify-form__header">
        <h1>Verify Credential</h1>
        <p>Paste or upload a signed verifiable credential to validate it as a relying party.</p>
      </header>

      <div className="verify-form__card">
        <div className="verify-form__inputs">
          <div className="verify-form__panel verify-form__panel--paste">
            <div className="verify-form__paste-header">
              <label className="verify-form__label" htmlFor="verify-json-input">
                <MaterialIcon name="code" size={18} />
                <span className="verify-form__label-text verify-form__desktop-only">Paste Credential JSON</span>
                <span className="verify-form__label-text verify-form__mobile-only">Paste JSON Credential</span>
              </label>
              <button type="button" className="verify-form__paste-btn verify-form__mobile-only" onClick={handlePaste}>
                <MaterialIcon name="content_paste" size={18} />
                Paste
              </button>
            </div>
            <textarea
              id="verify-json-input"
              className={`verify-form__textarea${parseError ? ' verify-form__textarea--error' : ''}`}
              rows={10}
              placeholder={'{\n  "@context": [\n    "https://www.w3.org/2018/credentials/v1"\n  ],\n  ...\n}'}
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="verify-form__divider" aria-hidden="true">
            <span>Or</span>
          </div>

          <div className="verify-form__panel verify-form__panel--upload">
            <label className="verify-form__label verify-form__label--desktop" htmlFor="verify-file-input">
              <MaterialIcon name="upload_file" size={18} />
              Upload .json file
            </label>
            <div
              className="verify-form__upload"
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.currentTarget.classList.add('verify-form__upload--drag')
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                event.currentTarget.classList.remove('verify-form__upload--drag')
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.currentTarget.classList.remove('verify-form__upload--drag')
                const file = event.dataTransfer.files?.[0]
                if (file) onFileLoad(file)
              }}
            >
              <MaterialIcon name="upload" size={40} filled className="verify-form__upload-icon" />
              <p className="verify-form__upload-title verify-form__desktop-only">
                Drag &amp; drop your file here
              </p>
              <p className="verify-form__upload-hint verify-form__desktop-only">or click to browse</p>
              <p className="verify-form__upload-title verify-form__mobile-only">
                Click to upload or drag and drop
              </p>
              <p className="verify-form__upload-note verify-form__mobile-only">
                JSON, JSON-LD (Max 5MB)
              </p>
              <button
                type="button"
                className="verify-form__browse verify-form__mobile-only"
                onClick={(event) => {
                  event.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                id="verify-file-input"
                type="file"
                accept=".json,.jsonld,application/json"
                className="verify-form__file-input"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {parseError && (
          <p className="verify-form__error" role="alert">
            {parseError}
          </p>
        )}

        <div className="verify-form__actions">
          <button
            type="button"
            className="verify-form__submit"
            onClick={onSubmit}
            disabled={loading || !jsonText.trim()}
          >
            <MaterialIcon name="verified" size={20} />
            {loading ? 'Verifying…' : 'Verify Credential'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ state }) {
  if (state === 'passed') return <MaterialIcon name="check_circle" size={20} className="verify-check--passed" />
  if (state === 'failed') return <MaterialIcon name="cancel" size={20} className="verify-check--failed" filled />
  return <MaterialIcon name="remove_circle" size={20} className="verify-check--skipped" filled />
}

function CheckBadge({ state }) {
  const labels = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped' }
  return <span className={`verify-check-badge verify-check-badge--${state}`}>{labels[state]}</span>
}

export function VerifyResultValid({
  credential,
  result,
  jsonExpanded,
  onToggleDetails,
  onReverify,
  onScanAnother,
  reverifying,
}) {
  const { checks = {}, details = {} } = result
  const jsonPretty = JSON.stringify(credential, null, 2)

  return (
    <div className="verify-result verify-result--valid">
      <header className="verify-result__header verify-result__mobile-only verify-result__mobile-back">
        <button type="button" className="verify-result__back-btn" onClick={onScanAnother} aria-label="Back">
          <MaterialIcon name="arrow_back" size={24} />
        </button>
        <h1>Verification Result</h1>
      </header>

      <header className="verify-result__header verify-result__desktop-only">
        <h1>Verify Credential</h1>
        <p>Validate institutional credentials and certificates.</p>
      </header>

      <section className="verify-result__json-card">
        <label className="verify-form__label">Credential JSON</label>
        <div className="verify-result__json-box">
          <pre>{jsonPretty}</pre>
          <button
            type="button"
            className="verify-result__reverify"
            onClick={onReverify}
            disabled={reverifying}
          >
            <MaterialIcon name="refresh" size={16} />
            {reverifying ? 'Verifying…' : 'Re-verify'}
          </button>
        </div>
      </section>

      <div className="verify-result__verdict verify-result__verdict--valid">
        <MaterialIcon name="check_circle" size={48} filled className="verify-result__verdict-icon" />
        <div>
          <h2>Valid</h2>
          <p>Credential is valid and authenticated.</p>
        </div>
      </div>

      <div className="verify-result__groups verify-result__desktop-only">
        {CHECK_GROUPS.map((group) => (
          <article key={group.id} className="verify-result__group-card">
            <div className="verify-result__group-header">
              <MaterialIcon name={group.icon} size={22} />
              <h3>{group.title}</h3>
            </div>
            <ul>
              {group.items.map((item) => {
                const state = checkState(checks[item.key])
                if (state === 'skipped') return null
                return (
                  <li key={item.key} className={`verify-result__check verify-result__check--${state}`}>
                    <CheckIcon state={state} />
                    <span>{item.label}</span>
                  </li>
                )
              })}
            </ul>
          </article>
        ))}
      </div>

      <div className="verify-result__mobile-summary verify-result__mobile-only">
        <h3>Verification Summary</h3>
        {buildMobileSummary(result).map((item) => (
          <article key={item.id} className="verify-result__summary-card">
            <MaterialIcon name={item.icon} size={22} filled className={item.ok ? 'verify-check--passed' : 'verify-check--failed'} />
            <div>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>

      <details className="verify-result__details" open={jsonExpanded}>
        <summary onClick={(event) => { event.preventDefault(); onToggleDetails() }}>
          Technical Details
          <MaterialIcon name={jsonExpanded ? 'expand_less' : 'expand_more'} size={24} />
        </summary>
        {jsonExpanded && (
          <div className="verify-result__details-grid">
            <div>
              <span>Credential ID</span>
              <code>{details.credential_id || credential?.id || '—'}</code>
            </div>
            <div>
              <span>Issuer DID</span>
              <code>{details.issuer_did || credential?.issuer || '—'}</code>
            </div>
            <div>
              <span>Holder DID</span>
              <code>{details.holder_did || credential?.credentialSubject?.id || '—'}</code>
            </div>
            <div>
              <span>Recovered Signer</span>
              <code>{details.recovered_signer || '—'}</code>
            </div>
            <div className="verify-result__details-span">
              <span>Issuer Address</span>
              <code>{details.issuer_address || '—'}</code>
            </div>
            {details.credential_hash && (
              <div className="verify-result__details-span">
                <span>Credential Hash</span>
                <code>{details.credential_hash}</code>
              </div>
            )}
          </div>
        )}
      </details>

      <div className="verify-result__mobile-actions verify-result__mobile-only">
        <button type="button" className="verify-result__secondary-btn" onClick={onScanAnother}>
          Scan Another
        </button>
      </div>
    </div>
  )
}

export function VerifyResultInvalid({
  credential,
  result,
  onTryAgain,
  onReverify,
  reverifying,
}) {
  const { checks = {}, errors = [] } = result
  const jsonPretty = JSON.stringify(credential, null, 2)

  return (
    <div className="verify-result verify-result--invalid">
      <header className="verify-result__header">
        <h1>Verification Result</h1>
        <p>Review the validation checks for the submitted credential.</p>
      </header>

      <div className="verify-result__invalid-grid">
        <div className="verify-result__invalid-main">
          <article className="verify-result__verdict-card">
            <div className="verify-result__verdict-top">
              <div className="verify-result__verdict-icon-wrap verify-result__verdict-icon-wrap--invalid">
                <MaterialIcon name="error" size={28} filled />
              </div>
              <div>
                <span className="verify-result__invalid-badge">Invalid</span>
                <h2>Credential verification failed</h2>
              </div>
            </div>
            <p>
              The submitted credential did not pass all necessary validation checks and cannot be
              considered authentic.
            </p>
          </article>

          {errors.length > 0 && (
            <article className="verify-result__errors-card">
              <h3>
                <MaterialIcon name="warning" size={18} />
                Critical Errors Found
              </h3>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </article>
          )}

          <article className="verify-result__checks-card">
            <header>
              <h3>Validation Checks</h3>
            </header>
            <ul className="verify-result__checks-list">
              {FLAT_CHECKS.map((item) => {
                const state = checkState(checks[item.key])
                return (
                  <li key={item.key} className={`verify-result__check-row verify-result__check-row--${state}`}>
                    <div className="verify-result__check-row-label">
                      <CheckIcon state={state} />
                      <span>{item.label}</span>
                    </div>
                    <CheckBadge state={state} />
                  </li>
                )
              })}
            </ul>
          </article>

          <div className="verify-result__invalid-actions">
            <button type="button" className="verify-result__try-again" onClick={onTryAgain}>
              <MaterialIcon name="refresh" size={18} />
              Try Again
            </button>
          </div>
        </div>

        <aside className="verify-result__payload-card">
          <header>
            <h3>Input Payload</h3>
            <button
              type="button"
              className="verify-result__copy-btn"
              onClick={() => navigator.clipboard.writeText(jsonPretty)}
              aria-label="Copy payload"
            >
              <MaterialIcon name="content_copy" size={18} />
            </button>
          </header>
          <pre>{jsonPretty}</pre>
          <button
            type="button"
            className="verify-result__reverify verify-result__reverify--block"
            onClick={onReverify}
            disabled={reverifying}
          >
            <MaterialIcon name="refresh" size={16} />
            {reverifying ? 'Verifying…' : 'Re-verify'}
          </button>
        </aside>
      </div>
    </div>
  )
}
