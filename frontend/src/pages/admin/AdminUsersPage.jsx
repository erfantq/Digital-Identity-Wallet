import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '@/api/auth'
import { ApiError } from '@/api/client'
import {
  EMPTY_FORM,
  RegisterUserForm,
  RegisterUserSuccess,
} from '@/components/admin/RegisterUserPanel'
import { MaterialIcon } from '@/components/landing/MaterialIcon'
import { useAuth } from '@/hooks/useAuth'
import { getRegisterRoleOptions } from '@/utils/roles'

/**
 * Admin Register User page.
 * Endpoints: POST /auth/register
 */
export function AdminUsersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const roleOptions = getRegisterRoleOptions(user?.role)
  const [view, setView] = useState('form')
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    document.title = 'FUM Wallet - Register User'
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    setGlobalError(null)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setGlobalError(null)
    setSuccessData(null)
    setSuccessMessage('')
    setView('form')
  }

  function mapApiError(err) {
    const nextFieldErrors = {}
    let nextGlobalError = 'Unable to register user. Please try again.'

    if (err instanceof ApiError) {
      const message = err.message
      nextGlobalError = message

      if (err.status === 409) {
        if (message.toLowerCase().includes('username')) {
          nextFieldErrors.username = message
          nextGlobalError =
            'Unable to create user profile due to validation conflicts. Please correct the highlighted fields below and try again.'
        } else if (message.toLowerCase().includes('email')) {
          nextFieldErrors.email = message
          nextGlobalError =
            'Unable to create user profile due to validation conflicts. Please correct the highlighted fields below and try again.'
        }
      }
    }

    setFieldErrors(nextFieldErrors)
    setGlobalError(nextGlobalError)
    setView('form')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setFieldErrors({})
    setGlobalError(null)

    if (!form.role) {
      setFieldErrors({ role: 'Please select a role.' })
      setLoading(false)
      return
    }

    const payload = {
      username: form.username.trim(),
      password: form.password,
      role: form.role,
    }

    if (form.email.trim()) {
      payload.email = form.email.trim()
    }

    try {
      const response = await registerUser(payload)
      setSuccessData(response.data)
      setSuccessMessage(response.message || 'User registered successfully. DID creation started.')
      setView('success')
    } catch (err) {
      mapApiError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-user">
      {view === 'success' && successData ? (
        <>
          <div className="register-user__breadcrumb register-user__breadcrumb--desktop">
            <span>Admin</span>
            <MaterialIcon name="chevron_right" size={16} />
            <span className="register-user__breadcrumb-active">Register User</span>
          </div>
          <RegisterUserSuccess
            result={successData}
            message={successMessage}
            onRegisterAnother={resetForm}
            onViewProfile={() =>
              navigate('/admin/directory', {
                state: { userId: successData.user_id, username: successData.username },
              })
            }
            onIssueCredential={() => navigate('/admin/issue')}
          />
        </>
      ) : (
        <>
          <header className="register-user__header">
            <h1 className="register-user__title">Register User</h1>
            <p className="register-user__subtitle">
              Create a new account so the user can sign in with the credentials you assign.
            </p>
          </header>

          <RegisterUserForm
            form={form}
            fieldErrors={fieldErrors}
            globalError={globalError}
            loading={loading}
            roleOptions={roleOptions}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </>
      )}
    </div>
  )
}
