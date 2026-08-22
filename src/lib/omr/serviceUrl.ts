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
