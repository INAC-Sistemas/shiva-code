/**
 * Load-time resolution of the plugin's deployment-varying values: which URL
 * receives the credentials, how long a request may take, and how long a
 * granted session lives.
 *
 * Every check here runs at `apply`, not on the first login: a gate pointed at
 * a URL nobody serves must fail while the operator is still watching the boot
 * log, not when a user is locked out of the app.
 * @module dsh-login/config
 */

/** The subset of `process.env` this module reads. */
export type EnvLike = Record<string, string | undefined>

/** The two config fields that name the endpoint. */
export interface EndpointSource {
  /** Fallback URL when the environment variable is unset or blank. */
  endpoint: string
  /** Name of the environment variable that overrides {@link endpoint}. */
  endpointEnv: string
}

/**
 * Resolve the endpoint the credentials are posted to. The environment wins
 * over the config value, so one built profile serves every deployment; a blank
 * variable counts as unset rather than as an empty URL.
 * @param env - the process environment.
 * @param source - the configured URL and the variable name that overrides it.
 * @returns the parsed URL and where it came from.
 * @throws Error when the resolved value is not an absolute http(s) URL.
 */
export function resolveEndpoint(env: EnvLike, source: EndpointSource): { url: URL; from: 'env' | 'config' } {
  const override = env[source.endpointEnv]?.trim()
  const from = override !== undefined && override !== '' ? 'env' : 'config'
  const value = from === 'env' ? override as string : source.endpoint
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `dsh-login: the login endpoint is not an absolute URL: ${value} `
      + `(from ${from === 'env' ? `$${source.endpointEnv}` : 'config.endpoint'})`,
    )
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`dsh-login: the login endpoint must be http(s), got ${url.protocol}`)
  }
  return { url, from }
}

/**
 * Reject a non-positive deadline: a zero or negative timeout aborts every
 * request before it is sent, which reads as "the server is down" forever.
 * @param timeoutMs - the configured deadline.
 * @throws Error when the deadline is not a positive finite number.
 */
export function assertTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`dsh-login: timeoutMs must be a positive finite number, got ${timeoutMs}`)
  }
}

/**
 * Reject a negative session lifetime; `0` is the documented "never expires"
 * value and any positive number is a real lifetime.
 * @param sessionTtlMs - the configured lifetime.
 * @throws Error when the lifetime is negative or not finite.
 */
export function assertSessionTtl(sessionTtlMs: number): void {
  if (!Number.isFinite(sessionTtlMs) || sessionTtlMs < 0) {
    throw new Error(`dsh-login: sessionTtlMs must be zero or a positive finite number, got ${sessionTtlMs}`)
  }
}

/**
 * Convert the configured lifetime into the wire value.
 * @param sessionTtlMs - the validated lifetime, where zero means no expiry.
 * @returns the lifetime in milliseconds, or null for a session that never expires.
 */
export function sessionLifetime(sessionTtlMs: number): number | null {
  return sessionTtlMs === 0 ? null : sessionTtlMs
}
