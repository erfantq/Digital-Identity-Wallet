import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="state-panel state-panel--empty">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/" className="btn btn--secondary">
        Go home
      </Link>
    </div>
  )
}
