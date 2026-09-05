import { Link } from 'react-router-dom'

export function SessionExpiredPage() {
  return (
    <div className="session-expired-page">
      <div className="session-expired-page__panel">
        <h1>Session expired</h1>
        <p>Your sign-in session is no longer valid. Please sign in again to continue.</p>
        <Link to="/login" className="btn btn--primary">
          Sign in
        </Link>
      </div>
    </div>
  )
}
