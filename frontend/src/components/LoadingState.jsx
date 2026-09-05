export function LoadingState({
  title = 'Loading',
  message = 'Please wait…',
}) {
  return (
    <div className="state-panel state-panel--loading" role="status" aria-live="polite">
      <div className="state-panel__spinner" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  )
}
