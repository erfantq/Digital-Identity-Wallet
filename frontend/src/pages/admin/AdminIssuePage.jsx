import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { issueCredential } from '@/api/credentials'
import { getHolderProfileByDid } from '@/api/dids'
import { ApiError } from '@/api/client'
import {
  IssueCredentialForm,
  IssueCredentialSuccess,
} from '@/components/admin/IssueCredentialPanel'
import {
  EMPTY_ISSUE_FORM,
  buildIssuePayload,
  memberRoleFromAccountRole,
  validateAttachment,
  validateIssueForm,
} from '@/utils/issueCredential'

/**
 * Admin Issue Credential page.
 * Endpoint: POST /credentials/issue (multipart: cred_json + optional attachment)
 */
export function AdminIssuePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState('form')
  const [form, setForm] = useState(EMPTY_ISSUE_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [holderDidError, setHolderDidError] = useState(false)
  const [holderLookupLoading, setHolderLookupLoading] = useState(false)
  const [holderLookupError, setHolderLookupError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [jsonExpanded, setJsonExpanded] = useState(false)

  useEffect(() => {
    document.title = 'FUM Wallet - Issue Credential'
  }, [])

  const lookupHolderProfile = useCallback(async (didValue) => {
    const did = didValue?.trim()
    if (!did) {
      setHolderLookupError(null)
      setForm((prev) => ({
        ...prev,
        holderUsername: '',
        holderAccountRole: '',
        role: '',
      }))
      return
    }

    setHolderLookupLoading(true)
    setHolderLookupError(null)

    try {
      const profile = await getHolderProfileByDid(did)
      setForm((prev) => ({
        ...prev,
        holderUsername: profile.username ?? '',
        holderAccountRole: profile.role ?? '',
        role: memberRoleFromAccountRole(profile.role),
      }))
      setHolderDidError(false)
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        holderUsername: '',
        holderAccountRole: '',
        role: '',
      }))
      if (err instanceof ApiError && err.status === 404) {
        setHolderLookupError('No wallet account is linked to this DID.')
      } else {
        setHolderLookupError('Could not resolve holder account for this DID.')
      }
    } finally {
      setHolderLookupLoading(false)
    }
  }, [])

  useEffect(() => {
    const prefillDid = location.state?.holderDid
    if (typeof prefillDid !== 'string' || !prefillDid.trim()) return

    const trimmed = prefillDid.trim()
    setView('form')
    setResult(null)
    setForm((prev) => ({
      ...prev,
      holder_did: trimmed,
    }))
    lookupHolderProfile(trimmed)
    navigate('/admin/issue', { replace: true, state: {} })
  }, [location.state, lookupHolderProfile, navigate])
  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    if (name === 'holder_did') {
      setHolderDidError(false)
      setHolderLookupError(null)
      setGlobalError(null)
      if (!value.trim()) {
        setForm((prev) => ({
          ...prev,
          holderUsername: '',
          holderAccountRole: '',
          role: '',
        }))
      }
    }
  }

  function handleSelectChange(event) {
    handleChange(event)
  }

  function handleCredentialTypeChange(event) {
    const credentialType = event.target.value
    setForm((prev) => ({ ...prev, credentialType }))
    setFieldErrors({})
    setGlobalError(null)
  }

  function handleHolderDidBlur(event) {
    lookupHolderProfile(event.target.value)
  }

  function handleFileChange(file) {
    const attachmentError = validateAttachment(file)
    setForm((prev) => ({ ...prev, attachment: file }))
    setFieldErrors((prev) => ({ ...prev, attachment: attachmentError || undefined }))
  }

  function handleClearAttachment() {
    setForm((prev) => ({ ...prev, attachment: null }))
    setFieldErrors((prev) => ({ ...prev, attachment: undefined }))
  }

  function resetForm() {
    setForm(EMPTY_ISSUE_FORM)
    setFieldErrors({})
    setGlobalError(null)
    setHolderDidError(false)
    setHolderLookupError(null)
    setResult(null)
    setJsonExpanded(false)
    setView('form')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = validateIssueForm(form)
    const attachmentError = validateAttachment(form.attachment)
    if (attachmentError) errors.attachment = attachmentError

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setGlobalError(null)
      setHolderDidError(false)
      return
    }

    let holderUsername = form.holderUsername?.trim()
    let holderAccountRole = form.holderAccountRole
    if (!holderUsername) {
      try {
        const profile = await getHolderProfileByDid(form.holder_did.trim())
        holderUsername = profile.username ?? ''
        holderAccountRole = profile.role ?? ''
        setForm((prev) => ({
          ...prev,
          holderUsername,
          holderAccountRole,
          role: memberRoleFromAccountRole(profile.role),
        }))
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setHolderLookupError('No wallet account is linked to this DID.')
        } else {
          setHolderLookupError('Could not resolve holder account for this DID.')
        }
        return
      }
    }

    if (!holderUsername) {
      setHolderLookupError('Resolve the holder DID to a wallet account before issuing.')
      return
    }

    setLoading(true)
    setFieldErrors({})
    setGlobalError(null)
    setHolderDidError(false)

    try {
      const payload = buildIssuePayload({
        ...form,
        holderUsername,
        holderAccountRole,
        role: memberRoleFromAccountRole(holderAccountRole),
      })
      const data = await issueCredential(payload, form.attachment)
      setResult(data)
      setView('success')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setHolderDidError(true)
          setGlobalError('Please verify the identifier and try again.')
          setFieldErrors({
            holder_did: 'Holder DID could not be resolved on the network.',
          })
        } else {
          setGlobalError(err.message)
        }
      } else {
        setGlobalError('Failed to issue credential. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="issue-cred">
      {view === 'form' && (
        <>
          <header className="issue-cred__page-header">
            <h1>Issue Credential</h1>
            <p>Issue a verifiable credential to a holder DID.</p>
          </header>

          <IssueCredentialForm
            form={form}
            fieldErrors={fieldErrors}
            globalError={globalError}
            holderDidError={holderDidError}
            holderLookupLoading={holderLookupLoading}
            holderLookupError={holderLookupError}
            loading={loading}
            attachmentName={form.attachment?.name}
            onChange={handleChange}
            onSelectChange={handleSelectChange}
            onCredentialTypeChange={handleCredentialTypeChange}
            onHolderDidBlur={handleHolderDidBlur}
            onFileChange={handleFileChange}
            onClearAttachment={handleClearAttachment}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/admin')}
          />
        </>
      )}

      {view === 'success' && result && (
        <IssueCredentialSuccess
          result={result}
          jsonExpanded={jsonExpanded}
          onToggleJson={() => setJsonExpanded((value) => !value)}
          onViewRegistry={() => navigate('/admin/credentials')}
          onIssueAnother={resetForm}
        />
      )}
    </div>
  )
}
