export const DEFAULT_UNIVERSITY = 'Ferdowsi University of Mashhad'

export const CREDENTIAL_TYPE_OPTIONS = [
  {
    value: 'UniversityPIDCredential',
    label: 'University PID',
    description: 'Personal identity credential for a university member.',
  },
  {
    value: 'UniversityEnrollmentCredential',
    label: 'Enrollment',
    description: 'Active enrollment or employment status at the university.',
  },
  {
    value: 'UniversityCertificateCredential',
    label: 'Degree Certificate',
    description: 'Completed degree or graduation certificate.',
  },
]

export const DEFAULT_CREDENTIAL_TYPE = CREDENTIAL_TYPE_OPTIONS[0].value

export function memberRoleFromAccountRole(accountRole) {
  if (accountRole === 'student') return 'Student'
  if (accountRole === 'teacher') return 'Teacher'
  return ''
}

export const DEGREE_OPTIONS = ['Bachelor', 'Master', 'PhD']

export const TEACHER_RANK_OPTIONS = [
  'Instructor',
  'Lecturer',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
]

export const EMPTY_ISSUE_FORM = {
  holder_did: '',
  holderUsername: '',
  holderAccountRole: '',
  credentialType: DEFAULT_CREDENTIAL_TYPE,
  firstName: '',
  lastName: '',
  nationalId: '',
  university: DEFAULT_UNIVERSITY,
  faculty: '',
  department: '',
  role: '',
  degreeLevel: 'Bachelor',
  enrollmentYear: '',
  currentTerm: '',
  academicRank: TEACHER_RANK_OPTIONS[0],
  employmentYear: '',
  programName: '',
  graduationDate: '',
  honors: '',
  gpa: '',
  attachment: null,
}

const SHARED_TEXT_FIELDS = ['firstName', 'lastName', 'nationalId', 'faculty', 'department']

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalNumber(value) {
  if (value === '' || value == null) return undefined
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

function pickTrimmed(form, keys) {
  const result = {}
  for (const key of keys) {
    const value = trimOrEmpty(form[key])
    if (value) result[key] = value
  }
  return result
}

export function buildIssuePayload(form) {
  const credential_data = {
    ...pickTrimmed(form, SHARED_TEXT_FIELDS),
    university: trimOrEmpty(form.university) || DEFAULT_UNIVERSITY,
  }

  if (trimOrEmpty(form.holderUsername)) {
    credential_data.username = trimOrEmpty(form.holderUsername)
  }

  // Member role is always derived from the linked wallet account — never trust UI overrides.
  const derivedRole = memberRoleFromAccountRole(form.holderAccountRole)

  switch (form.credentialType) {
    case 'UniversityPIDCredential':
      credential_data.role = derivedRole
      break

    case 'UniversityEnrollmentCredential':
      credential_data.role = derivedRole
      if (derivedRole === 'Student') {
        credential_data.degreeLevel = form.degreeLevel
        const enrollmentYear = optionalNumber(form.enrollmentYear)
        const currentTerm = optionalNumber(form.currentTerm)
        if (enrollmentYear != null) credential_data.enrollmentYear = enrollmentYear
        if (currentTerm != null) credential_data.currentTerm = currentTerm
      } else if (derivedRole === 'Teacher') {
        credential_data.academicRank = form.academicRank
        const employmentYear = optionalNumber(form.employmentYear)
        if (employmentYear != null) credential_data.employmentYear = employmentYear
      }
      break

    case 'UniversityCertificateCredential':
      Object.assign(
        credential_data,
        pickTrimmed(form, ['programName', 'graduationDate', 'honors', 'gpa']),
      )
      credential_data.degreeLevel = form.degreeLevel
      break

    default:
      break
  }

  return {
    holder_did: trimOrEmpty(form.holder_did),
    type: form.credentialType,
    credential_data,
  }
}

function validateYearField(value, fieldName, errors, { min = 1950, max = 2050 } = {}) {
  if (value === '') return
  const year = Number(value)
  if (Number.isNaN(year) || year < min || year > max) {
    errors[fieldName] = `Enter a valid year (${min}–${max}).`
  }
}

function validateSharedFields(form, errors, { requireNationalId = false } = {}) {
  if (!trimOrEmpty(form.firstName)) errors.firstName = 'First name is required.'
  if (!trimOrEmpty(form.lastName)) errors.lastName = 'Last name is required.'
  if (requireNationalId && !trimOrEmpty(form.nationalId)) {
    errors.nationalId = 'National ID is required.'
  }
}

function requireText(form, field, label, errors) {
  if (!trimOrEmpty(form[field])) {
    errors[field] = `${label} is required.`
  }
}

export function validateIssueForm(form) {
  const errors = {}

  if (!trimOrEmpty(form.holder_did)) {
    errors.holder_did = 'Holder DID is required.'
  }

  const derivedRole = memberRoleFromAccountRole(form.holderAccountRole)
  const needsMemberRole = showsRoleSelector(form.credentialType)

  if (needsMemberRole && trimOrEmpty(form.holder_did)) {
    if (!trimOrEmpty(form.holderAccountRole)) {
      errors.role = 'Resolve the holder DID before issuing this credential.'
    } else if (!derivedRole) {
      errors.role =
        'Holder account role must be student or teacher to issue this credential type.'
    }
  }

  switch (form.credentialType) {
    case 'UniversityPIDCredential':
      validateSharedFields(form, errors, { requireNationalId: true })
      break

    case 'UniversityEnrollmentCredential':
      validateSharedFields(form, errors)
      if (derivedRole === 'Student') {
        validateYearField(form.enrollmentYear, 'enrollmentYear', errors)
        if (form.currentTerm !== '') {
          const term = Number(form.currentTerm)
          if (Number.isNaN(term) || term < 1 || term > 12) {
            errors.currentTerm = 'Enter a valid term (1–12).'
          }
        }
      } else if (derivedRole === 'Teacher') {
        validateYearField(form.employmentYear, 'employmentYear', errors)
      }
      break

    case 'UniversityCertificateCredential':
      validateSharedFields(form, errors)
      requireText(form, 'programName', 'Program name', errors)
      requireText(form, 'graduationDate', 'Graduation date', errors)
      break

    default:
      break
  }

  return errors
}

export function showsEnrollmentSection(credentialType) {
  return credentialType === 'UniversityEnrollmentCredential'
}

export function showsCertificateSection(credentialType) {
  return credentialType === 'UniversityCertificateCredential'
}

export function showsRoleSelector(credentialType) {
  return (
    credentialType === 'UniversityPIDCredential' ||
    credentialType === 'UniversityEnrollmentCredential'
  )
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
