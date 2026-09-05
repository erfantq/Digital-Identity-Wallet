export function EmptyState({ title, message, action }) {
  return (
    <div className="state-panel state-panel--empty">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}
