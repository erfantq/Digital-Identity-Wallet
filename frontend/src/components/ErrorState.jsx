export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
