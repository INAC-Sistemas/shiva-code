/**
 * Load-time validation of the plugin config.
 *
 * Every check here fails the composition rather than the first request. A bad
 * endpoint would otherwise surface as a picker that lists nothing, which reads
 * as "you have no profiles" — the hardest failure to trace back to a typo.
 * @module dsh-profiles/config
 */

/** Hosts allowed to be reached over plain http. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Parse and check one configured endpoint.
 *
 * Plain http is refused off loopback: these requests carry the signed-in user's
 * bearer token, and the answer decides which plugins this machine composes.
 * Loopback stays allowed because that is where the plugin manager runs in
 * development.
 * @param label - the config field name, for the error message.
 * @param endpoint - the configured URL.
 * @returns the URL, requested verbatim.
 * @throws Error when the value is not an absolute http(s) URL, or is http off loopback.
 */
export function resolveEndpoint(label: string, endpoint: string): URL {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error(`dsh-profiles: ${label} is not an absolute URL: ${endpoint}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`dsh-profiles: ${label} must be http(s), got ${url.protocol}`)
  }
  if (url.protocol === 'http:' && !LOOPBACK.has(url.hostname)) {
    throw new Error(
      `dsh-profiles: ${label} must be https off loopback, got ${url.origin}. `
      + 'The signed-in bearer token travels on this request, and its answer decides what this machine composes.',
    )
  }
  return url
}

/**
 * Check a request deadline.
 * @param label - the config field name, for the error message.
 * @param value - the configured value in milliseconds.
 * @returns the value.
 * @throws Error when it is not a positive safe integer.
 */
export function assertTimeout(label: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`dsh-profiles: ${label} must be a positive integer, got ${value}`)
  }
  return value
}
