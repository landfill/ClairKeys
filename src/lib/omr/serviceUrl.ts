/**
 * Resolves the OMR service base URL.
 *
 * Both OMR routes used to default to `https://clairkeys-omr.fly.dev`. That
 * hostname was never deployed — `fly.toml` was written and abandoned when the
 * service moved to a NAVER Cloud VM — but Fly's wildcard DNS still resolves it,
 * so the request reached a TLS handshake and *threw*. A thrown `fetch` skips
 * the `!response.ok` branch, so an unconfigured deployment surfaced as
 * `Internal server error` instead of "the service is not configured".
 *
 * There is no default any more. An unset variable is a configuration fact the
 * caller can state plainly, and it costs nothing to detect.
 */
export class OmrServiceNotConfiguredError extends Error {
  constructor() {
    super(
      'OMR_SERVICE_URL is not set. The sheet music conversion service is not ' +
        'configured for this deployment.'
    )
    this.name = 'OmrServiceNotConfiguredError'
  }
}

export function getOmrServiceUrl(): string {
  const configured = process.env.OMR_SERVICE_URL?.trim()

  if (!configured) {
    throw new OmrServiceNotConfiguredError()
  }

  return configured.replace(/\/+$/, '')
}

/**
 * Header carrying the shared secret the deployed service requires.
 *
 * The VM sits on a public IP with SELinux disabled and firewalld inactive, and
 * one `/process` call spends up to fifteen minutes of a two-vCPU box. The
 * exposure worth controlling is an unauthenticated caller, not an eavesdropper,
 * so the secret is mandatory on the service side and fails closed when unset.
 *
 * This returns an empty object when the secret is absent rather than throwing:
 * a service run locally with `ENVIRONMENT=development` accepts requests without
 * one, and a deployed service answers 503 by itself, which is a clearer signal
 * than a client-side guess.
 */
export function omrAuthHeaders(): Record<string, string> {
  const secret = process.env.OMR_SHARED_SECRET?.trim()

  return secret ? { 'X-ClairKeys-Token': secret } : {}
}
