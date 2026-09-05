export function MaterialIcon({ name, filled = false, className = '', size }) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' material-symbols-outlined--filled' : ''}${className ? ` ${className}` : ''}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
