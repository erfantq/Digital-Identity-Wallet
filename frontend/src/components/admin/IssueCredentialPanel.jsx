import { useRef } from 'react'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { CopyButton } from '@/components/admin/DidManagementPanel'
import {
  ATTACHMENT_ACCEPT,
  formatCredentialTypeLabel,
  getDerivedFieldValues,
  getVisibleTemplateFields,
  ipfsGatewayUrls,
  memberRoleFromAccountRole,
} from '@/utils/issueCredential'

function FormField({
  id,
  label,
  required = false,
  error,
  children,
  className = '',
  hint,
}) {
  return (
    <div className={`issue-cred__field ${className}`.trim()}>
      <label className="issue-cred__label" htmlFor={id}>
        {label}
        {required && <span className="issue-cred__required">*</span>}
      </label>
      {children}
      {hint && <p className="issue-cred__field-hint">{hint}</p>}
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

function DynamicTemplateField({
  field,
  value,
  fileValue,
  error,
  derivedRole,
  holderLookupLoading,
  holderAccountRole,
  loading,
  onFieldChange,
  onFileFieldChange,
  onClearFileField,
}) {
  const inputId = `field-${field.key}`

  if (field.data_type === 'derived') {
    return (
      <FormField
        id={inputId}
        label={field.label}
        required={field.required}
        error={error}
        hint="Locked to the wallet account role linked to this DID. It cannot be changed manually."
      >
        <div className={`issue-cred__input-wrap${error ? ' issue-cred__input-wrap--error' : ''}`}>
          <input
            id={inputId}
            type="text"
            className={`issue-cred__input issue-cred__input--locked${error ? ' issue-cred__input--error' : ''}`}
            value={
              derivedRole ||
              (holderLookupLoading
                ? 'Resolving from DID…'
                : holderAccountRole
                  ? `Unsupported account role: ${holderAccountRole}`
                  : 'Resolved from holder DID')
            }
            readOnly
            disabled
            aria-readonly="true"
          />
          <MaterialIcon name="lock" size={18} className="issue-cred__lock-icon" />
        </div>
      </FormField>
    )
  }

  if (field.data_type === 'select') {
    return (
      <FormField id={inputId} label={field.label} required={field.required} error={error}>
        <select
          id={inputId}
          className="issue-cred__input issue-cred__select"
          value={value ?? ''}
          onChange={(event) => onFieldChange(field.key, event.target.value)}
          disabled={loading}
        >
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormField>
    )
  }

  if (field.data_type === 'boolean') {
    return (
      <FormField id={inputId} label={field.label} required={field.required} error={error}>
        <label className="issue-cred__checkbox">
          <input
            id={inputId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onFieldChange(field.key, event.target.checked)}
            disabled={loading}
          />
          <span>Yes</span>
        </label>
      </FormField>
    )
  }

  if (field.data_type === 'file') {
    return (
      <FormField id={inputId} label={field.label} required={field.required} error={error}>
        {fileValue ? (
          <div className="issue-cred__file-selected">
            <span>{fileValue.name}</span>
            <button type="button" onClick={() => onClearFileField(field.key)} disabled={loading}>
              Remove
            </button>
          </div>
        ) : (
          <input
            id={inputId}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="issue-cred__input"
            onChange={(event) => onFileFieldChange(field.key, event.target.files?.[0] ?? null)}
            disabled={loading}
          />
        )}
      </FormField>
    )
  }

  const inputType =
    field.data_type === 'number' ? 'number' : field.data_type === 'date' ? 'date' : 'text'

  return (
    <FormField id={inputId} label={field.label} required={field.required} error={error}>
      <input
        id={inputId}
        type={inputType}
        className={`issue-cred__input${error ? ' issue-cred__input--error' : ''}`}
        value={value ?? ''}
        onChange={(event) => onFieldChange(field.key, event.target.value)}
        disabled={loading}
      />
    </FormField>
  )
}

export function IssueCredentialForm({
  form,
  template,
  credentialTypes = [],
  typesLoading = false,
  typesError = null,
  fieldErrors,
  globalError,
  holderDidError,
  holderLookupLoading,
  holderLookupError,
  loading,
  attachmentName,
  onChange,
  onFieldValueChange,
  onCredentialTypeChange,
  onHolderDidBlur,
  onFileChange,
  onClearAttachment,
  onFileFieldChange,
  onClearFileField,
  onSubmit,
  onCancel,
}) {
  const fileInputRef = useRef(null)
  const derivedRole = memberRoleFromAccountRole(form.holderAccountRole)
  const derivedValues = getDerivedFieldValues(template, form.holderAccountRole)
  const visibleFields = getVisibleTemplateFields(template, form.fieldValues, form.holderAccountRole)
  const selectedType =
    credentialTypes.find((item) => item.type_id === form.credentialType) || template

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

      {typesError && (
        <div className="issue-cred__banner issue-cred__banner--error" role="alert">
          <MaterialIcon name="error" filled className="issue-cred__banner-icon" />
          <div>
            <h3>Unable to load credential types</h3>
            <p>{typesError}</p>
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
              <p className="issue-cred__field-hint">Wallet role: {form.holderAccountRole}</p>
            )}
          </FormField>

          <FormField
            id="credential-type"
            label="Credential Type"
            required
            error={fieldErrors.credentialType}
          >
            <select
              id="credential-type"
              name="credentialType"
              className="issue-cred__input issue-cred__select"
              value={form.credentialType}
              onChange={onCredentialTypeChange}
              disabled={loading || typesLoading || credentialTypes.length === 0}
            >
              {credentialTypes.length === 0 && <option value="">No types available</option>}
              {credentialTypes.map((option) => (
                <option key={option.type_id} value={option.type_id}>
                  {option.display_name || option.type_id}
                </option>
              ))}
            </select>
            {selectedType?.description && (
              <p className="issue-cred__field-hint">{selectedType.description}</p>
            )}
          </FormField>
        </div>
      </section>

      <section className="issue-cred__card">
        <SectionHeader icon="article" title="Credential Data (Subject)" />
        {typesLoading ? (
          <p className="issue-cred__field-hint">Loading template fields…</p>
        ) : visibleFields.length === 0 ? (
          <p className="issue-cred__field-hint">Select a credential type to load its fields.</p>
        ) : (
          <div className="issue-cred__grid issue-cred__grid--2">
            {visibleFields.map((field) => (
              <DynamicTemplateField
                key={field.key}
                field={field}
                value={
                  field.data_type === 'derived'
                    ? derivedValues[field.key]
                    : form.fieldValues?.[field.key]
                }
                fileValue={form.fileFields?.[field.key]}
                error={fieldErrors[field.key]}
                derivedRole={derivedRole}
                holderLookupLoading={holderLookupLoading}
                holderAccountRole={form.holderAccountRole}
                loading={loading}
                onFieldChange={onFieldValueChange}
                onFileFieldChange={onFileFieldChange}
                onClearFileField={onClearFileField}
              />
            ))}
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
        <button type="submit" className="issue-cred__btn issue-cred__btn--primary" disabled={loading || typesLoading}>
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

export function IssueCredentialSuccess({
  result,
  credentialTypes = [],
  jsonExpanded,
  onToggleJson,
  onViewRegistry,
  onIssueAnother,
}) {
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
            value={formatCredentialTypeLabel(
              Array.isArray(credential?.type)
                ? credential.type[credential.type.length - 1]
                : credential?.type,
              credentialTypes,
            )}
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
                  const blob = new Blob([JSON.stringify(credential, null, 2)], {
                    type: 'application/json',
                  })
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
