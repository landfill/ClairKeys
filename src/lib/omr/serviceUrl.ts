/**
 * Resolves the OMR service base URL.
 *
 * Both OMR routes used to have a hard-coded default for a service that was
 * never deployed. Requests to that placeholder threw before the
 * `!response.ok` branch, so an unconfigured deployment surfaced as `Internal
 * server error` instead of "the service is not configured".
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

/**
 * Why a configured URL is unusable, phrased for the operator and never
 * carrying the value. The caller turns it into its own error class.
 */
type HttpUrlProblem = 'not-absolute' | `scheme:${string}`

/**
 * Parses a value typed into a deployment dashboard as an absolute http(s)
 * URL. Shared by every variable that names an address this application will
 * send something to, so the rules cannot drift between them.
 */
function parseHttpUrl(value: string): { url: URL } | { problem: HttpUrlProblem } {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { problem: 'not-absolute' }
  }

  // Parsing alone is not enough. `new URL('example.com:3000')` succeeds by
  // reading `example.com:` as the scheme, so a hostname typed without one can
  // arrive here looking well formed and then fail at `fetch`.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { problem: `scheme:${parsed.protocol}` }
  }

  return { url: parsed }
}

export function getOmrServiceUrl(): string {
  const configured = process.env.OMR_SERVICE_URL?.trim()

  if (!configured) {
    throw new OmrServiceNotConfiguredError()
  }

  const result = parseHttpUrl(configured)
  if ('problem' in result) {
    // Deliberately without the value. The caller logs this error and echoes its
    // message in development, and a URL can carry credentials — putting the raw
    // value here would put a password in a log to diagnose a typo.
    throw new OmrServiceNotConfiguredError(
      result.problem === 'not-absolute'
        ? 'OMR_SERVICE_URL is not an absolute URL. It must include a scheme, ' +
            'for example http://host:port.'
        : `OMR_SERVICE_URL must use http: or https:, not ${result.problem.slice('scheme:'.length)}`
    )
  }

  return configured.replace(/\/+$/, '')
}

/**
 * The upload route hands this address to the OMR service, and the service
 * POSTs the shared secret to it when a job completes. D-036: it comes from
 * configuration only — never from the request, whose Host header is the one
 * input here an outside party can shape — and a missing value is refused the
 * same way a malformed one is. The rules are the ones `getOmrServiceUrl`
 * applies, for the same reasons.
 */
export class OmrCallbackNotConfiguredError extends Error {
  constructor(reason = 'NEXTAUTH_URL is not set.') {
    super(`${reason} The conversion callback address is not configured for this deployment.`)
    this.name = 'OmrCallbackNotConfiguredError'
  }
}

export function getOmrCallbackUrl(): string {
  const configured = process.env.NEXTAUTH_URL?.trim()

  if (!configured) {
    throw new OmrCallbackNotConfiguredError()
  }

  const result = parseHttpUrl(configured)
  if ('problem' in result) {
    throw new OmrCallbackNotConfiguredError(
      result.problem === 'not-absolute'
        ? 'NEXTAUTH_URL is not an absolute URL. It must include a scheme, ' +
            'for example https://host.'
        : `NEXTAUTH_URL must use http: or https:, not ${result.problem.slice('scheme:'.length)}`
    )
  }

  return new URL('/api/omr/finalize', result.url).toString()
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
