export function DesignPlaceholder({ title, endpoints, note }) {
  return (
    <section className="design-placeholder">
      <p className="design-placeholder__eyebrow">Awaiting Stitch design</p>
      <h1>{title}</h1>
      <p className="design-placeholder__lead">
        This route is scaffolded and wired to the backend API layer. Visual design will be
        implemented from your Stitch screenshots.
      </p>
      <div className="design-placeholder__card">
        <h2>Endpoints</h2>
        <ul>
          {endpoints.map((endpoint) => (
            <li key={endpoint}>
              <code>{endpoint}</code>
            </li>
          ))}
        </ul>
      </div>
      {note && <p className="design-placeholder__note">{note}</p>}
    </section>
  )
}
