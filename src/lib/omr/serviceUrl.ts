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
 *
 * A malformed value is the same fact. This variable is typed into a deployment
 * dashboard by a person, so `101.79.16.73:3000` with the scheme left off is a
 * likelier mistake than an empty field — and checking only for emptiness sent
 * every such value into the caller's `catch`, which reports an unreachable
 * service and asks the user to try again later. Nothing about a missing scheme
 * improves by retrying. Both problems are now the same error, because both have
 * the same remedy: an operator fixes the value.
 */
export class OmrServiceNotConfiguredError extends Error {
  constructor(reason = 'OMR_SERVICE_URL is not set.') {
    super(
      `${reason} The sheet music conversion service is not configured for this ` +
        'deployment.'
    )
    this.name = 'OmrServiceNotConfiguredError'
  }
}

export function getOmrServiceUrl(): string {
  const configured = process.env.OMR_SERVICE_URL?.trim()

  if (!configured) {
    throw new OmrServiceNotConfiguredError()
  }

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    // Deliberately without the value. The caller logs this error and echoes its
    // message in development, and a URL can carry credentials — putting the raw
    // value here would put a password in a log to diagnose a typo.
    throw new OmrServiceNotConfiguredError(
      'OMR_SERVICE_URL is not an absolute URL. It must include a scheme, ' +
        'for example http://host:port.'
    )
  }

  // Parsing alone is not enough. `new URL('example.com:3000')` succeeds by
  // reading `example.com:` as the scheme, so a hostname typed without one can
  // arrive here looking well formed and then fail at `fetch`.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OmrServiceNotConfiguredError(
      `OMR_SERVICE_URL must use http: or https:, not ${parsed.protocol}`
    )
  }

  return configured.replace(/\/+$/, '')
}
