import { DesignPlaceholder } from '@/components/DesignPlaceholder'

export function AdminTrustPage() {
  return (
    <DesignPlaceholder
      title="Trusted issuers"
      endpoints={[
        'GET /trusted-entities/{account}/is-authorized-issuer',
        'POST /trusted-entities/authorize',
        'POST /trusted-entities/revoke',
      ]}
      note="Authorize/revoke require super_admin. Account is sent in the request body for both authorize and revoke."
    />
  )
}
