export const DEFAULT_UNIVERSITY = 'Ferdowsi University of Mashhad'

export const FIELD_DATA_TYPES = [
  'string',
  'number',
  'date',
  'select',
  'file',
  'boolean',
  'derived',
]

const LEGACY_CREDENTIAL_TYPE_MAP = {
  UniversityCredential: 'UniversityPIDCredential',
  VerifiableCredential: 'UniversityPIDCredential',
}

export const EMPTY_ISSUE_FORM = {
  holder_did: '',
  holderUsername: '',
  holderAccountRole: '',
  credentialType: '',
  fieldValues: {},
  fileFields: {},
  attachment: null,
}

export function createEmptyIssueForm(credentialType = '') {
  return {
    ...EMPTY_ISSUE_FORM,
    credentialType,
    fieldValues: {},
    fileFields: {},
    attachment: null,
  }
}

export function normalizeCredentialType(type) {
  if (!type) return ''
  if (Array.isArray(type)) {
    const concrete = [...type].reverse().find((item) => item && item !== 'VerifiableCredential')
    return normalizeCredentialType(concrete || type[0])
  }
  const cleaned = String(type).trim()
  if (!cleaned) return ''
  return LEGACY_CREDENTIAL_TYPE_MAP[cleaned] || cleaned
}

export function formatCredentialTypeLabel(type, types = []) {
  const normalized = normalizeCredentialType(type)
  if (!normalized) return '—'
  const match = types.find((item) => item.type_id === normalized)
  if (match?.display_name) return match.display_name
  return normalized
}

export function memberRoleFromAccountRole(accountRole) {
  if (accountRole === 'student') return 'Student'
  if (accountRole === 'teacher') return 'Teacher'
  return ''
}

export function sortTemplateFields(fields = []) {
  return [...fields].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
}

export function getDerivedFieldValues(template, holderAccountRole) {
  const result = {}
  for (const field of template?.fields || []) {
    if (field.data_type === 'derived' && field.source === 'holder_account_role') {
      result[field.key] = memberRoleFromAccountRole(holderAccountRole)
    }
  }
  return result
}

export function isFieldVisible(field, values) {
  const rule = field?.visible_when
  if (!rule) return true
  return values?.[rule.field] === rule.equals
}

export function getVisibleTemplateFields(template, fieldValues, holderAccountRole) {
  const derived = getDerivedFieldValues(template, holderAccountRole)
  const values = { ...fieldValues, ...derived }
  return sortTemplateFields(template?.fields || []).filter((field) => isFieldVisible(field, values))
}

export function defaultFieldValuesForTemplate(template) {
  const values = {}
  for (const field of sortTemplateFields(template?.fields || [])) {
    if (field.data_type === 'derived' || field.data_type === 'file') continue
    if (field.key === 'university') {
      values[field.key] = DEFAULT_UNIVERSITY
      continue
    }
    if (field.data_type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      values[field.key] = field.options[0]
      continue
    }
    if (field.data_type === 'boolean') {
      values[field.key] = false
      continue
    }
    values[field.key] = ''
  }
  return values
}

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalNumber(value) {
  if (value === '' || value == null) return undefined
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

export function resolveIssueAttachment(form, template) {
  if (form.attachment) return form.attachment
  const fileFields = getVisibleTemplateFields(template, form.fieldValues, form.holderAccountRole).filter(
    (field) => field.data_type === 'file',
  )
  for (const field of fileFields) {
    const file = form.fileFields?.[field.key]
    if (file) return file
  }
  return null
}

export function buildIssuePayload(form, template) {
  const derived = getDerivedFieldValues(template, form.holderAccountRole)
  const values = { ...form.fieldValues, ...derived }
  const credential_data = {}

  for (const field of getVisibleTemplateFields(template, form.fieldValues, form.holderAccountRole)) {
    if (field.data_type === 'derived') {
      if (derived[field.key]) credential_data[field.key] = derived[field.key]
      continue
    }

    if (field.data_type === 'file') {
      continue
    }

    if (field.data_type === 'boolean') {
      credential_data[field.key] = Boolean(values[field.key])
      continue
    }

    if (field.data_type === 'number') {
      const num = optionalNumber(values[field.key])
      if (num != null) credential_data[field.key] = num
      continue
    }

    const text = trimOrEmpty(values[field.key])
    if (field.key === 'university' && !text) {
      credential_data.university = DEFAULT_UNIVERSITY
      continue
    }
    if (text) credential_data[field.key] = text
  }

  if (trimOrEmpty(form.holderUsername)) {
    credential_data.username = trimOrEmpty(form.holderUsername)
  }

  return {
    holder_did: trimOrEmpty(form.holder_did),
    type: form.credentialType || template?.type_id,
    credential_data,
  }
}

export function validateIssueForm(form, template) {
  const errors = {}

  if (!trimOrEmpty(form.holder_did)) {
    errors.holder_did = 'Holder DID is required.'
  }

  if (!form.credentialType || !template) {
    errors.credentialType = 'Select a credential type.'
    return errors
  }

  const derived = getDerivedFieldValues(template, form.holderAccountRole)
  const visibleFields = getVisibleTemplateFields(template, form.fieldValues, form.holderAccountRole)

  for (const field of visibleFields) {
    if (field.data_type === 'derived') {
      if (field.required) {
        if (!trimOrEmpty(form.holderAccountRole)) {
          errors[field.key] = 'Resolve the holder DID before issuing this credential.'
        } else if (!derived[field.key]) {
          errors[field.key] =
            'Holder account role must be student or teacher to issue this credential type.'
        }
      }
      continue
    }

    if (field.data_type === 'file') {
      const file = form.fileFields?.[field.key] || (field.key === 'attachment' ? form.attachment : null)
      if (field.required && !file && !form.attachment) {
        errors[field.key] = `${field.label} is required.`
      }
      continue
    }

    if (field.data_type === 'boolean') {
      continue
    }

    const raw = form.fieldValues?.[field.key]
    if (field.required && (raw == null || String(raw).trim() === '')) {
      errors[field.key] = `${field.label} is required.`
      continue
    }

    if (field.data_type === 'number' && raw !== '' && raw != null) {
      const num = Number(raw)
      if (Number.isNaN(num)) {
        errors[field.key] = `${field.label} must be a number.`
      }
    }

    if (field.data_type === 'select' && raw) {
      const options = field.options || []
      if (options.length > 0 && !options.includes(raw)) {
        errors[field.key] = `${field.label} must be one of the allowed options.`
      }
    }
  }

  return errors
}

export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png'
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

export function validateAttachment(file) {
  if (!file) return null
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return 'File must be 10MB or smaller.'
  }
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  if (!allowed.includes(file.type)) {
    return 'Only PDF, JPG, or PNG files are allowed.'
  }
  return null
}

export function downloadJson(data, filename = 'credential.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_IPFS_GATEWAY_BASES = [
  import.meta.env.VITE_IPFS_GATEWAY_URL,
  'https://gateway.pinata.cloud/ipfs',
].filter(Boolean)

function cidFromIpfsUri(uri) {
  if (!uri?.startsWith('ipfs://')) return null
  return uri.slice(7).replace(/^\/+/, '')
}

export function ipfsGatewayUrls(uri) {
  const cid = cidFromIpfsUri(uri)
  if (!cid) return []

  const bases =
    DEFAULT_IPFS_GATEWAY_BASES.length > 0
      ? DEFAULT_IPFS_GATEWAY_BASES
      : ['https://gateway.pinata.cloud/ipfs']

  return [...new Set(bases.map((base) => `${base.replace(/\/$/, '')}/${cid}`))]
}

export function ipfsGatewayUrl(uri) {
  return ipfsGatewayUrls(uri)[0] ?? null
}

/** Empty field draft for the credential-type builder. */
export function createEmptyFieldDraft(order = 1) {
  return {
    key: '',
    label: '',
    data_type: 'string',
    required: false,
    optionsText: '',
    visible_when_field: '',
    visible_when_equals: '',
    order,
    source: '',
  }
}

export function buildCredentialTypePayload(form) {
  const fields = (form.fields || []).map((field, index) => {
    const payload = {
      key: field.key.trim(),
      label: field.label.trim(),
      data_type: field.data_type,
      required: Boolean(field.required),
      order: Number(field.order) || index + 1,
    }

    if (field.data_type === 'select') {
      payload.options = String(field.optionsText || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (field.data_type === 'derived') {
      payload.source = field.source || 'holder_account_role'
    }

    const whenField = trimOrEmpty(field.visible_when_field)
    const whenEquals = trimOrEmpty(field.visible_when_equals)
    if (whenField && whenEquals !== '') {
      payload.visible_when = { field: whenField, equals: whenEquals }
    }

    return payload
  })

  return {
    type_id: form.type_id.trim(),
    display_name: form.display_name.trim(),
    description: trimOrEmpty(form.description) || null,
    revocable: Boolean(form.revocable),
    fields,
  }
}

export function validateCredentialTypeForm(form) {
  const errors = {}
  if (!trimOrEmpty(form.type_id)) errors.type_id = 'Type ID is required.'
  else if (!/^[A-Za-z0-9_]+$/.test(form.type_id.trim())) {
    errors.type_id = 'Type ID must be alphanumeric/underscore.'
  }

  if (!trimOrEmpty(form.display_name)) errors.display_name = 'Display name is required.'

  if (!form.fields?.length) {
    errors.fields = 'Add at least one field.'
    return errors
  }

  const keys = new Set()
  form.fields.forEach((field, index) => {
    const prefix = `field_${index}`
    if (!trimOrEmpty(field.key)) errors[`${prefix}_key`] = 'Key is required.'
    else if (!/^[A-Za-z0-9_]+$/.test(field.key.trim())) {
      errors[`${prefix}_key`] = 'Key must be alphanumeric/underscore.'
    } else if (keys.has(field.key.trim())) {
      errors[`${prefix}_key`] = 'Field keys must be unique.'
    } else {
      keys.add(field.key.trim())
    }

    if (!trimOrEmpty(field.label)) errors[`${prefix}_label`] = 'Label is required.'

    if (field.data_type === 'select') {
      const options = String(field.optionsText || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      if (options.length === 0) {
        errors[`${prefix}_options`] = 'Select fields need at least one option.'
      }
    }

    if (field.data_type === 'derived' && field.source && field.source !== 'holder_account_role') {
      errors[`${prefix}_source`] = 'Derived source must be holder_account_role.'
    }
  })

  return errors
}
