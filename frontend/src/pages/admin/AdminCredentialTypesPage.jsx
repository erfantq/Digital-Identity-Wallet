import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { createCredentialType, listCredentialTypes } from '@/api/credentialTypes'
import { ApiError } from '@/api/client'
import {
  CredentialTypeCreateForm,
  CredentialTypeDetail,
  CredentialTypeList,
} from '@/components/admin/CredentialTypesPanel'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/utils/roles'
import {
  buildCredentialTypePayload,
  createEmptyFieldDraft,
  validateCredentialTypeForm,
} from '@/utils/issueCredential'

const EMPTY_FORM = {
  type_id: '',
  display_name: '',
  description: '',
  revocable: false,
  fields: [createEmptyFieldDraft(1)],
}

/**
 * Super-admin Credential Types page.
 * Endpoints: GET /credential-types, POST /credential-types
 */
export function AdminCredentialTypesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [selectedTypeId, setSelectedTypeId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    document.title = 'FUM Wallet - Credential Types'
  }, [])

  const fetchTypes = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listCredentialTypes()
      const nextItems = Array.isArray(data) ? data : data?.items || []
      setItems(nextItems)
      setSelectedTypeId((current) => current || nextItems[0]?.type_id || null)
    } catch (err) {
      setItems([])
      setListError(err instanceof ApiError ? err.message : 'Failed to load credential types.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSuperAdmin(user?.role)) return
    fetchTypes()
  }, [fetchTypes, user?.role])

  const selected = useMemo(
    () => items.find((item) => item.type_id === selectedTypeId) || null,
    [items, selectedTypeId],
  )

  if (!isSuperAdmin(user?.role)) {
    return <Navigate to="/admin" replace />
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    setGlobalError(null)
  }

  function handleFieldChange(index, key, value) {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => {
        if (i !== index) return field
        const next = { ...field, [key]: value }
        if (key === 'data_type') {
          if (value === 'derived') next.source = 'holder_account_role'
          else next.source = ''
          if (value !== 'select') next.optionsText = ''
        }
        return next
      }),
    }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[`field_${index}_${key === 'optionsText' ? 'options' : key}`]
      return next
    })
  }

  function handleAddField() {
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, createEmptyFieldDraft(prev.fields.length + 1)],
    }))
  }

  function handleRemoveField(index) {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields
        .filter((_, i) => i !== index)
        .map((field, i) => ({ ...field, order: Number(field.order) || i + 1 })),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateCredentialTypeForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setCreating(true)
    setGlobalError(null)
    setFieldErrors({})

    try {
      const payload = buildCredentialTypePayload(form)
      const created = await createCredentialType(payload)
      setForm({
        type_id: '',
        display_name: '',
        description: '',
        revocable: false,
        fields: [createEmptyFieldDraft(1)],
      })
      await fetchTypes()
      setSelectedTypeId(created?.type_id || payload.type_id)
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Failed to create credential type.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="cred-types">
      <header className="cred-types__page-header">
        <h1>Credential Types</h1>
        <p>Define immutable credential templates used by the issue form.</p>
      </header>

      {listError && (
        <div className="user-dir__error-banner" role="alert">
          {listError}
        </div>
      )}

      <div className="cred-types__layout">
        <CredentialTypeList
          items={items}
          selectedTypeId={selectedTypeId}
          onSelect={setSelectedTypeId}
          loading={listLoading}
        />
        <CredentialTypeDetail item={selected} />
      </div>

      <CredentialTypeCreateForm
        form={form}
        fieldErrors={fieldErrors}
        globalError={globalError}
        loading={creating}
        onChange={handleFormChange}
        onFieldChange={handleFieldChange}
        onAddField={handleAddField}
        onRemoveField={handleRemoveField}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
