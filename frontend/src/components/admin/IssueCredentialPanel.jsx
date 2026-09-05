import { useRef } from 'react'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { CopyButton } from '@/components/admin/DidManagementPanel'
import {
  ATTACHMENT_ACCEPT,
  CREDENTIAL_TYPE_OPTIONS,
  DEGREE_OPTIONS,
  ipfsGatewayUrls,
  memberRoleFromAccountRole,
  showsCertificateSection,
  showsEnrollmentSection,
  showsRoleSelector,
  TEACHER_RANK_OPTIONS,
} from '@/utils/issueCredential'

function FormField({
  id,
  label,
  required = false,
  error,
  children,
  className = '',
}) {
  return (
    <div className={`issue-cred__field ${className}`.trim()}>
      <label className="issue-cred__label" htmlFor={id}>
        {label}
        {required && <span className="issue-cred__required">*</span>}
      </label>
      {children}
      {error && (
        <p className="issue-cred__field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

function SectionHeader({ icon, title }) {
  return (
    <div className="issue-cred__section-header">
      <MaterialIcon name={icon} size={24} className="issue-cred__section-icon" />
      <h3>{title}</h3>
    </div>
  )
}

export function IssueCredentialForm({
  form,
  fieldErrors,
  globalError,
  holderDidError,
  holderLookupLoading,
  holderLookupError,
  loading,
  attachmentName,
  onChange,
  onSelectChange,
  onCredentialTypeChange,
  onHolderDidBlur,
  onFileChange,
  onClearAttachment,
  onSubmit,
  onCancel,
}) {
  const fileInputRef = useRef(null)

  const selectedType =
    CREDENTIAL_TYPE_OPTIONS.find((option) => option.value === form.credentialType) ??
    CREDENTIAL_TYPE_OPTIONS[0]
  const derivedRole = memberRoleFromAccountRole(form.holderAccountRole)
  const isStudent = derivedRole === 'Student'

  function handleFileInput(event) {
    const file = event.target.files?.[0] ?? null
    onFileChange(file)
  }

  return (
    <form className="issue-cred__form" onSubmit={onSubmit} noValidate>
      {globalError && (
        <div className="issue-cred__banner issue-cred__banner--error" role="alert">
          <MaterialIcon name="error" filled className="issue-cred__banner-icon" />
          <div>
            <h3>{holderDidError ? 'Error: Holder DID not found' : 'Unable to issue credential'}</h3>
            <p>{globalError}</p>
          </div>
        </div>
      )}

      <section className="issue-cred__card">
        <SectionHeader icon="person_search" title="Holder Details" />
        <div className="issue-cred__grid issue-cred__grid--2">
          <FormField
            id="holder-did"
            label="Holder DID"
            required
            error={fieldErrors.holder_did || holderLookupError}
            className="issue-cred__field--span-2"
          >
            <div className={`issue-cred__input-wrap${fieldErrors.holder_did || holderLookupError ? ' issue-cred__input-wrap--error' : ''}`}>
              <input
                id="holder-did"
                name="holder_did"
                type="text"
                className="issue-cred__input"
                placeholder="did:ethr:6:0x..."
                value={form.holder_did}
                onChange={onChange}
                onBlur={onHolderDidBlur}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.holder_did || holderLookupError)}
              />
              {(fieldErrors.holder_did || holderLookupError) && (
                <MaterialIcon name="warning" filled size={20} className="issue-cred__input-warning" />
              )}
            </div>
          </FormField>

          <FormField id="holder-username" label="Account Username">
            <div className="issue-cred__input-wrap">
              <input
                id="holder-username"
                type="text"
                className="issue-cred__input issue-cred__input--readonly"
                value={
                  holderLookupLoading
                    ? 'Looking up…'
                    : form.holderUsername || 'Resolved from holder DID'
                }
                readOnly
              />
            </div>
            {form.holderAccountRole && (
              <p className="issue-cred__field-hint">
                Wallet role: {form.holderAccountRole}
              </p>
            )}
          </FormField>

          <FormField id="credential-type" label="Credential Type" required>
            <select
              id="credential-type"
              name="credentialType"
              className="issue-cred__input issue-cred__select"
              value={form.credentialType}
              onChange={onCredentialTypeChange}
              disabled={loading}
            >
              {CREDENTIAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="issue-cred__field-hint">{selectedType.description}</p>
          </FormField>
        </div>
      </section>

      <section className="issue-cred__card">
        <SectionHeader icon="article" title="Credential Data (Subject)" />

        <div className="issue-cred__subsection">
          <h4 className="issue-cred__subsection-title">Personal Information</h4>
          <div className="issue-cred__grid issue-cred__grid--3">
            <FormField id="first-name" label="First Name" required error={fieldErrors.firstName}>
              <input
                id="first-name"
                name="firstName"
                type="text"
                className={`issue-cred__input${fieldErrors.firstName ? ' issue-cred__input--error' : ''}`}
                value={form.firstName}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
            <FormField id="last-name" label="Last Name" required error={fieldErrors.lastName}>
              <input
                id="last-name"
                name="lastName"
                type="text"
                className={`issue-cred__input${fieldErrors.lastName ? ' issue-cred__input--error' : ''}`}
                value={form.lastName}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
            <FormField id="national-id" label="National ID" required={form.credentialType === 'UniversityPIDCredential'} error={fieldErrors.nationalId}>
              <input
                id="national-id"
                name="nationalId"
                type="text"
                className="issue-cred__input"
                value={form.nationalId}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
          </div>
        </div>

        <div className="issue-cred__subsection">
          <h4 className="issue-cred__subsection-title">Academic Record</h4>
          <div className="issue-cred__grid issue-cred__grid--2">
            <FormField id="university" label="University" className="issue-cred__field--span-2">
              <input
                id="university"
                name="university"
                type="text"
                className="issue-cred__input issue-cred__input--readonly"
                value={form.university}
                readOnly
              />
            </FormField>
            <FormField id="faculty" label="Faculty" error={fieldErrors.faculty}>
              <input
                id="faculty"
                name="faculty"
                type="text"
                className="issue-cred__input"
                value={form.faculty}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
            <FormField id="department" label="Department" className="issue-cred__field--span-2" error={fieldErrors.department}>
              <input
                id="department"
                name="department"
                type="text"
                className="issue-cred__input"
                value={form.department}
                onChange={onChange}
                disabled={loading}
              />
            </FormField>
          </div>
        </div>

        {showsRoleSelector(form.credentialType) && (
          <div className="issue-cred__subsection">
            <h4 className="issue-cred__subsection-title">Affiliation</h4>
            <div className="issue-cred__grid issue-cred__grid--2">
              <FormField
                id="role"
                label="Member Role"
                error={fieldErrors.role}
              >
                <div className={`issue-cred__input-wrap${fieldErrors.role ? ' issue-cred__input-wrap--error' : ''}`}>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    className={`issue-cred__input issue-cred__input--locked${fieldErrors.role ? ' issue-cred__input--error' : ''}`}
                    value={
                      derivedRole ||
                      (holderLookupLoading
                        ? 'Resolving from DID…'
                        : form.holderAccountRole
                          ? `Unsupported account role: ${form.holderAccountRole}`
                          : 'Resolved from holder DID')
                    }
                    readOnly
                    disabled
                    aria-readonly="true"
                  />
                  <MaterialIcon name="lock" size={18} className="issue-cred__lock-icon" />
                </div>
                <p className="issue-cred__field-hint">
                  Locked to the wallet account role linked to this DID. It cannot be changed manually.
                </p>
              </FormField>
            </div>
          </div>
        )}

        {showsEnrollmentSection(form.credentialType) && (
          <div className="issue-cred__subsection">
            <h4 className="issue-cred__subsection-title">
              {isStudent ? 'Student Enrollment' : 'Teacher Employment'}
            </h4>
            <div className="issue-cred__grid issue-cred__grid--4">
              {isStudent ? (
                <>
                  <FormField id="degree-level" label="Degree Level">
                    <select
                      id="degree-level"
                      name="degreeLevel"
                      className="issue-cred__input issue-cred__select"
                      value={form.degreeLevel}
                      onChange={onSelectChange}
                      disabled={loading}
                    >
                      {DEGREE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="enrollment-year" label="Enrollment Year" error={fieldErrors.enrollmentYear}>
                    <input
                      id="enrollment-year"
                      name="enrollmentYear"
                      type="number"
                      min="1950"
                      max="2050"
                      className={`issue-cred__input${fieldErrors.enrollmentYear ? ' issue-cred__input--error' : ''}`}
                      value={form.enrollmentYear}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </FormField>
                  <FormField id="current-term" label="Current Term" error={fieldErrors.currentTerm}>
                    <input
                      id="current-term"
                      name="currentTerm"
                      type="number"
                      min="1"
                      max="12"
                      className={`issue-cred__input${fieldErrors.currentTerm ? ' issue-cred__input--error' : ''}`}
                      value={form.currentTerm}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField id="academic-rank" label="Academic Rank">
                    <select
                      id="academic-rank"
                      name="academicRank"
                      className="issue-cred__input issue-cred__select"
                      value={form.academicRank}
                      onChange={onSelectChange}
                      disabled={loading}
                    >
                      {TEACHER_RANK_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="employment-year" label="Employment Start Year" error={fieldErrors.employmentYear}>
                    <input
                      id="employment-year"
                      name="employmentYear"
                      type="number"
                      min="1950"
                      max="2050"
                      className={`issue-cred__input${fieldErrors.employmentYear ? ' issue-cred__input--error' : ''}`}
                      value={form.employmentYear}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </FormField>
                </>
              )}
            </div>
          </div>
        )}

        {showsCertificateSection(form.credentialType) && (
          <div className="issue-cred__subsection">
            <h4 className="issue-cred__subsection-title">Degree Details</h4>
            <div className="issue-cred__grid issue-cred__grid--2">
              <FormField id="program-name" label="Program Name" required error={fieldErrors.programName}>
                <input
                  id="program-name"
                  name="programName"
                  type="text"
                  className={`issue-cred__input${fieldErrors.programName ? ' issue-cred__input--error' : ''}`}
                  value={form.programName}
                  onChange={onChange}
                  disabled={loading}
                  placeholder="e.g. Computer Engineering"
                />
              </FormField>
              <FormField id="degree-level-cert" label="Degree Level">
                <select
                  id="degree-level-cert"
                  name="degreeLevel"
                  className="issue-cred__input issue-cred__select"
                  value={form.degreeLevel}
                  onChange={onSelectChange}
                  disabled={loading}
                >
                  {DEGREE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="graduation-date" label="Graduation Date" required error={fieldErrors.graduationDate}>
                <input
                  id="graduation-date"
                  name="graduationDate"
                  type="date"
                  className={`issue-cred__input${fieldErrors.graduationDate ? ' issue-cred__input--error' : ''}`}
                  value={form.graduationDate}
                  onChange={onChange}
                  disabled={loading}
                />
              </FormField>
              <FormField id="gpa" label="GPA (optional)" error={fieldErrors.gpa}>
                <input
                  id="gpa"
                  name="gpa"
                  type="text"
                  className="issue-cred__input"
                  value={form.gpa}
                  onChange={onChange}
                  disabled={loading}
                  placeholder="e.g. 17.85"
                />
              </FormField>
              <FormField id="honors" label="Honors (optional)" className="issue-cred__field--span-2" error={fieldErrors.honors}>
                <input
                  id="honors"
                  name="honors"
                  type="text"
                  className="issue-cred__input"
                  value={form.honors}
                  onChange={onChange}
                  disabled={loading}
                  placeholder="e.g. First Class Honors"
                />
              </FormField>
            </div>
          </div>
        )}
      </section>

      <section className="issue-cred__card">
        <SectionHeader icon="attachment" title="Supporting Document" />
        <div
          className="issue-cred__upload"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              fileInputRef.current?.click()
            }
          }}
        >
          <div className="issue-cred__upload-icon-wrap">
            <MaterialIcon name="upload_file" size={28} />
          </div>
          {attachmentName ? (
            <>
              <p className="issue-cred__upload-title">{attachmentName}</p>
              <button
                type="button"
                className="issue-cred__upload-clear"
                onClick={(event) => {
                  event.stopPropagation()
                  onClearAttachment()
                }}
              >
                Remove file
              </button>
            </>
          ) : (
            <>
              <p className="issue-cred__upload-title">Click to upload or drag and drop</p>
              <p className="issue-cred__upload-hint">PDF, JPG, or PNG (max. 10MB)</p>
              <p className="issue-cred__upload-note">Optional; uploaded to IPFS if provided.</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="issue-cred__file-input"
            onChange={handleFileInput}
            disabled={loading}
          />
        </div>
        {fieldErrors.attachment && (
          <p className="issue-cred__field-error issue-cred__field-error--block">{fieldErrors.attachment}</p>
        )}
      </section>

      <div className="issue-cred__actions">
        <button
          type="button"
          className="issue-cred__btn issue-cred__btn--secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="issue-cred__btn issue-cred__btn--primary" disabled={loading}>
          <MaterialIcon name="send" size={20} />
          {loading ? 'Issuing…' : 'Issue Credential'}
        </button>
      </div>
    </form>
  )
}

function CopyableValue({ label, value }) {
  return (
    <div className="issue-cred__summary-field">
      <span className="issue-cred__summary-label">{label}</span>
      <div className="issue-cred__summary-box">
        <span className="issue-cred__summary-value">{value || '—'}</span>
        {value && <CopyButton value={value} label={`Copy ${label}`} />}
      </div>
    </div>
  )
}

function IpfsLinkRow({ label, uri, gatewayUrl, icon = 'folder_zip' }) {
  const gateways = gatewayUrl ? [gatewayUrl, ...ipfsGatewayUrls(uri)] : ipfsGatewayUrls(uri)
  const primaryGateway = gateways[0] ?? null

  if (!uri) {
    return (
      <div className="issue-cred__summary-field">
        <span className="issue-cred__summary-label">{label}</span>
        <div className="issue-cred__ipfs-box issue-cred__ipfs-box--empty">
          <span className="issue-cred__summary-value">Not provided</span>
        </div>
      </div>
    )
  }

  return (
    <div className="issue-cred__summary-field">
      <span className="issue-cred__summary-label">{label}</span>
      <div className="issue-cred__ipfs-box">
        <MaterialIcon name={icon} size={20} className="issue-cred__ipfs-icon" />
        {primaryGateway ? (
          <a href={primaryGateway} target="_blank" rel="noopener noreferrer" className="issue-cred__ipfs-link">
            {uri}
          </a>
        ) : (
          <span className="issue-cred__ipfs-link">{uri}</span>
        )}
        <CopyButton value={uri} label={`Copy ${label}`} />
        {primaryGateway && (
          <a
            href={primaryGateway}
            target="_blank"
            rel="noopener noreferrer"
            className="issue-cred__ipfs-open"
            aria-label={`Open ${label}`}
          >
            <MaterialIcon name="open_in_new" size={18} />
          </a>
        )}
      </div>
      {gateways.length > 1 && (
        <p className="issue-cred__ipfs-alt">
          Other gateways:{' '}
          {gateways.slice(1).map((url, index) => (
            <span key={url}>
              {index > 0 && ' · '}
              <a href={url} target="_blank" rel="noopener noreferrer">
                {new URL(url).hostname}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

export function IssueCredentialSuccess({ result, jsonExpanded, onToggleJson, onViewRegistry, onIssueAnother }) {
  const credential = result?.credential

  return (
    <div className="issue-cred__success">
      <header className="issue-cred__success-header">
        <h2>Issuance Complete</h2>
      </header>

      <div className="issue-cred__success-banner">
        <MaterialIcon name="check_circle" size={32} filled className="issue-cred__success-banner-icon" />
        <div>
          <h3>Credential issued successfully</h3>
          <p>The verifiable credential has been created and signed.</p>
        </div>
      </div>

      <div className="issue-cred__info-banner">
        <MaterialIcon name="info" size={20} />
        <p>
          Credential is saved; on-chain registry and SBT mint may continue asynchronously in the
          background.
        </p>
      </div>

      <div className="issue-cred__success-grid">
        <article className="issue-cred__card">
          <div className="issue-cred__section-header issue-cred__section-header--compact">
            <MaterialIcon name="list_alt" size={22} />
            <h3>Summary</h3>
          </div>
          <CopyableValue label="Credential ID" value={result.credential_id} />
          <CopyableValue
            label="Credential Type"
            value={
              Array.isArray(credential?.type)
                ? credential.type[credential.type.length - 1]
                : credential?.type
            }
          />
          <CopyableValue label="Account Username" value={credential?.credentialSubject?.username} />
          <CopyableValue label="Issuer DID" value={result.issuer} />
          <CopyableValue label="Holder DID" value={result.holder_did} />
        </article>

        <article className="issue-cred__card">
          <div className="issue-cred__section-header issue-cred__section-header--compact">
            <MaterialIcon name="link" size={22} />
            <h3>IPFS References</h3>
          </div>
          <IpfsLinkRow
            label="Attached Document"
            uri={result.attached_document}
            gatewayUrl={result.attached_document_gateway_url}
            icon="folder_zip"
          />
          <IpfsLinkRow
            label="NFT Metadata URI"
            uri={result.nft_metadata_uri}
            gatewayUrl={result.nft_metadata_gateway_url}
            icon="data_object"
          />
        </article>
      </div>

      <div className="issue-cred__json-card">
        <button
          type="button"
          className="issue-cred__json-toggle"
          onClick={onToggleJson}
          aria-expanded={jsonExpanded}
        >
          <div className="issue-cred__json-toggle-label">
            <MaterialIcon name="code" size={22} />
            <h3>View Signed Credential JSON</h3>
          </div>
          <MaterialIcon name={jsonExpanded ? 'expand_less' : 'expand_more'} size={24} />
        </button>
        {jsonExpanded && credential && (
          <div className="issue-cred__json-body">
            <pre>{JSON.stringify(credential, null, 2)}</pre>
            <div className="issue-cred__json-actions">
              <button
                type="button"
                className="issue-cred__btn issue-cred__btn--secondary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'credential.json'
                  link.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <MaterialIcon name="download" size={18} />
                Download JSON
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="issue-cred__success-actions">
        <button type="button" className="issue-cred__btn issue-cred__btn--secondary" onClick={onViewRegistry}>
          View Registry
        </button>
        <button type="button" className="issue-cred__btn issue-cred__btn--primary" onClick={onIssueAnother}>
          <MaterialIcon name="add" size={18} />
          Issue Another
        </button>
      </div>
    </div>
  )
}
