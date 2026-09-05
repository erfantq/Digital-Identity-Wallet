/**
 * Brand mark for FUM Wallet (university logo).
 */
export function BrandLogo({ className = '', size = 32, alt = 'FUM Wallet' }) {
  return (
    <img
      src="/fum-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`brand-logo${className ? ` ${className}` : ''}`}
      decoding="async"
    />
  )
}
