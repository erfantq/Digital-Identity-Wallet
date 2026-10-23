import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { FIELD_DATA_TYPES } from '@/utils/issueCredential'
import { formatUtcDate } from '@/utils/didFormat'

function FieldChip({ children }) {
  return <span className="cred-types__chip">{children}</span>
}

export function CredentialTypeList({ items, selectedTypeId, onSelect, loading }) {
  if (loading) {
    return (
      <section className="cred-types__list-panel">
        <div className="user-dir__detail-loading">
          <div className="state-panel__spinner" aria-hidden="true" />
          <p>Loading templates…</p>
        </div>
      </section>
    )
  }

  if (!items.length) {
    return (
      <section className="cred-types__list-panel">
        <div className="cred-types__empty">
          <MaterialIcon name="category" size={40} />
          <h3>No credential types yet</h3>
          <p>Create the first template using the form on the right.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="cred-types__list-panel">
      <ul className="cred-types__list">
        {items.map((item) => {
          const selected = item.type_id === selectedTypeId
          return (
            <li key={item.type_id}>
              <button
                type="button"
                className={`cred-types__list-item${selected ? ' cred-types__list-item--selected' : ''}`}
                onClick={() => onSelect(item.type_id)}
              >
                <div className="cred-types__list-item-top">
                  <strong>{item.display_name}</strong>
                  <FieldChip>{item.revocable ? 'Revocable' : 'Non-revocable'}</FieldChip>
                </div>
                <code>{item.type_id}</code>
                <span>{(item.fields || []).length} fields</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function CredentialTypeDetail({ item }) {
  if (!item) {
    return (
      <aside className="cred-types__detail">
        <div className="cred-types__empty cred-types__empty--compact">
          <MaterialIcon name="info" size={28} />
          <p>Select a template to inspect its fields.</p>
        </div>
      </aside>
    )
  }

  const fields = [...(item.fields || [])].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
  )

  return (
    <aside className="cred-types__detail">
      <header className="cred-types__detail-header">
        <div>
          <h2>{item.display_name}</h2>
          <code>{item.type_id}</code>
        </div>
        <FieldChip>{item.revocable ? 'Revocable' : 'Non-revocable'}</FieldChip>
      </header>

      {item.description && <p className="cred-types__detail-desc">{item.description}</p>}

      <dl className="cred-types__meta">
        <div>
          <dt>Created</dt>
          <dd>{formatUtcDate(item.created_at)}</dd>
        </div>
        <div>
          <dt>Schema hash</dt>
          <dd className="cred-types__mono">{item.schema_hash || '—'}</dd>
        </div>
        <div>
          <dt>TX hash</dt>
          <dd className="cred-types__mono">{item.tx_hash || '—'}</dd>
        </div>
      </dl>

      <h3 className="cred-types__section-title">Fields</h3>
      <div className="cred-types__fields-table-wrap">
        <table className="cred-types__fields-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Key</th>
              <th>Label</th>
              <th>Type</th>
              <th>Required</th>
              <th>Rules</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.key}>
                <td>{field.order ?? '—'}</td>
                <td>
                  <code>{field.key}</code>
                </td>
                <td>{field.label}</td>
                <td>{field.data_type}</td>
                <td>{field.required ? 'Yes' : 'No'}</td>
                <td>
                  {field.data_type === 'select' && field.options?.length
                    ? `options: ${field.options.join(', ')}`
                    : field.data_type === 'derived'
                      ? `source: ${field.source || '—'}`
                      : field.visible_when
                        ? `visible when ${field.visible_when.field} = ${field.visible_when.equals}`
                        : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  )
}

export function CredentialTypeCreateForm({
  form,
  fieldErrors,
  globalError,
  loading,
  onChange,
  onFieldChange,
  onAddField,
  onRemoveField,
  onSubmit,
}) {
  return (
    <form className="cred-types__form" onSubmit={onSubmit} noValidate>
      <header className="cred-types__form-header">
        <h2>Create template</h2>
        <p>Templates are immutable after creation. Define fields carefully.</p>
      </header>

      {globalError && (
        <div className="user-dir__error-banner" role="alert">
          {globalError}
        </div>
      )}

      <div className="cred-types__form-grid">
        <label className="cred-types__label">
          Type ID <span>*</span>
          <input
            name="type_id"
            value={form.type_id}
            onChange={onChange}
            disabled={loading}
            placeholder="UniversityCustomCredential"
          />
          {fieldErrors.type_id && <em>{fieldErrors.type_id}</em>}
        </label>

        <label className="cred-types__label">
          Display name <span>*</span>
          <input
            name="display_name"
            value={form.display_name}
            onChange={onChange}
            disabled={loading}
            placeholder="Custom Credential"
          />
          {fieldErrors.display_name && <em>{fieldErrors.display_name}</em>}
        </label>

        <label className="cred-types__label cred-types__label--span">
          Description
          <textarea
            name="description"
            rows={2}
            value={form.description}
            onChange={onChange}
            disabled={loading}
            placeholder="Optional summary shown on the issue form"
          />
        </label>

        <label className="cred-types__checkbox">
          <input
            type="checkbox"
            name="revocable"
            checked={form.revocable}
            onChange={onChange}
            disabled={loading}
          />
          Revocable
        </label>
      </div>

      <div className="cred-types__fields-header">
        <h3>Fields</h3>
        <button type="button" className="cred-types__btn cred-types__btn--secondary" onClick={onAddField} disabled={loading}>
          <MaterialIcon name="add" size={18} />
          Add field
        </button>
      </div>
      {fieldErrors.fields && <p className="cred-types__form-error">{fieldErrors.fields}</p>}

      <div className="cred-types__builder">
        {form.fields.map((field, index) => (
          <article key={`field-draft-${index}`} className="cred-types__builder-card">
            <div className="cred-types__builder-card-head">
              <strong>Field {index + 1}</strong>
              <button
                type="button"
                className="cred-types__icon-btn"
                onClick={() => onRemoveField(index)}
                disabled={loading || form.fields.length <= 1}
                aria-label={`Remove field ${index + 1}`}
              >
                <MaterialIcon name="delete" size={18} />
              </button>
            </div>

            <div className="cred-types__builder-grid">
              <label>
                Key *
                <input
                  value={field.key}
                  onChange={(event) => onFieldChange(index, 'key', event.target.value)}
                  disabled={loading}
                />
                {fieldErrors[`field_${index}_key`] && <em>{fieldErrors[`field_${index}_key`]}</em>}
              </label>
              <label>
                Label *
                <input
                  value={field.label}
                  onChange={(event) => onFieldChange(index, 'label', event.target.value)}
                  disabled={loading}
                />
                {fieldErrors[`field_${index}_label`] && <em>{fieldErrors[`field_${index}_label`]}</em>}
              </label>
              <label>
                Data type
                <select
                  value={field.data_type}
                  onChange={(event) => onFieldChange(index, 'data_type', event.target.value)}
                  disabled={loading}
                >
                  {FIELD_DATA_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Order
                <input
                  type="number"
                  value={field.order}
                  onChange={(event) => onFieldChange(index, 'order', event.target.value)}
                  disabled={loading}
                />
              </label>
              <label className="cred-types__checkbox">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) => onFieldChange(index, 'required', event.target.checked)}
                  disabled={loading}
                />
                Required
              </label>

              {field.data_type === 'select' && (
                <label className="cred-types__label--span">
                  Options (one per line)
                  <textarea
                    rows={3}
                    value={field.optionsText}
                    onChange={(event) => onFieldChange(index, 'optionsText', event.target.value)}
                    disabled={loading}
                  />
                  {fieldErrors[`field_${index}_options`] && (
                    <em>{fieldErrors[`field_${index}_options`]}</em>
                  )}
                </label>
              )}

              {field.data_type === 'derived' && (
                <label>
                  Source
                  <select
                    value={field.source || 'holder_account_role'}
                    onChange={(event) => onFieldChange(index, 'source', event.target.value)}
                    disabled={loading}
                  >
                    <option value="holder_account_role">holder_account_role</option>
                  </select>
                  {fieldErrors[`field_${index}_source`] && (
                    <em>{fieldErrors[`field_${index}_source`]}</em>
                  )}
                </label>
              )}

              <label>
                visible_when field
                <input
                  value={field.visible_when_field}
                  onChange={(event) => onFieldChange(index, 'visible_when_field', event.target.value)}
                  disabled={loading}
                  placeholder="role"
                />
              </label>
              <label>
                visible_when equals
                <input
                  value={field.visible_when_equals}
                  onChange={(event) => onFieldChange(index, 'visible_when_equals', event.target.value)}
                  disabled={loading}
                  placeholder="Student"
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <div className="cred-types__form-actions">
        <button type="submit" className="cred-types__btn cred-types__btn--primary" disabled={loading}>
          <MaterialIcon name="save" size={18} />
          {loading ? 'Creating…' : 'Create credential type'}
        </button>
      </div>
    </form>
  )
}
