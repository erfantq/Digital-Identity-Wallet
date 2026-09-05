import { useEffect, useState } from 'react'
import { verifyCredential } from '@/api/credentials'
import { ApiError } from '@/api/client'
import {
  VerifyCredentialForm,
  VerifyResultInvalid,
  VerifyResultValid,
} from '@/components/verifier/VerifyCredentialViews'
import { parseCredentialJson } from '@/utils/verifyCredential'

const MAX_FILE_BYTES = 5 * 1024 * 1024

/**
 * Public verifier page (Relying Party).
 * Endpoint: POST /credentials/verify
 */
export function VerifierPage({ embedded = false }) {
  const [phase, setPhase] = useState('idle')
  const [jsonText, setJsonText] = useState('')
  const [credential, setCredential] = useState(null)
  const [result, setResult] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)

  useEffect(() => {
    document.title = 'FUM Wallet - Verify Credential'
  }, [])

  async function runVerification(parsedCredential) {
    setLoading(true)
    setApiError(null)

    try {
      const data = await verifyCredential(parsedCredential)
      setCredential(parsedCredential)
      setResult(data)
      setPhase('result')
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Verification request failed.')
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setParseError(null)
    setApiError(null)

    try {
      const parsed = parseCredentialJson(jsonText)
      await runVerification(parsed)
    } catch (err) {
      setParseError(err.message)
    }
  }

  function handleFileLoad(file) {
    setParseError(null)
    setApiError(null)

    if (file.size > MAX_FILE_BYTES) {
      setParseError('File must be 5MB or smaller.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setJsonText(text)
      try {
        parseCredentialJson(text)
      } catch (err) {
        setParseError(err.message)
      }
    }
    reader.onerror = () => setParseError('Could not read the uploaded file.')
    reader.readAsText(file)
  }

  function handleReset() {
    setPhase('idle')
    setResult(null)
    setCredential(null)
    setParseError(null)
    setApiError(null)
    setJsonText('')
  }

  function handleScanAnother() {
    handleReset()
  }

  async function handleReverify() {
    if (!credential) return
    await runVerification(credential)
  }

  const content = (
    <>
      {phase === 'idle' && (
        <VerifyCredentialForm
          jsonText={jsonText}
          onJsonChange={(value) => {
            setJsonText(value)
            setParseError(null)
            setApiError(null)
          }}
          onFileLoad={handleFileLoad}
          onSubmit={handleVerify}
          loading={loading}
          parseError={parseError || apiError}
        />
      )}

      {phase === 'result' && result?.valid && credential && (
        <VerifyResultValid
          credential={credential}
          result={result}
          jsonExpanded={detailsOpen}
          onToggleDetails={() => setDetailsOpen((open) => !open)}
          onReverify={handleReverify}
          onScanAnother={handleScanAnother}
          reverifying={loading}
        />
      )}

      {phase === 'result' && result && !result.valid && credential && (
        <VerifyResultInvalid
          credential={credential}
          result={result}
          onTryAgain={handleReset}
          onReverify={handleReverify}
          reverifying={loading}
        />
      )}
    </>
  )

  if (embedded) {
    return (
      <div className="verify-page verify-page--embedded">
        <div className="verify-main verify-main--embedded">
          <div className="verify-main__content">{content}</div>
        </div>
      </div>
    )
  }

  return <div className="verify-main__content">{content}</div>
}
