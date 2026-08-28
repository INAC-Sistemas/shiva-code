/**
 * dsh-vps-status: a model-facing `vps_status` tool over one configured HTTP
 * endpoint.
 *
 * Host-only by design — the package declares no `dsh.client`, so the web shell
 * serves no bundle for it and nothing of this plugin reaches a browser. The
 * model sees the tool name, its description and its result; the endpoint's
 * implementation stays wherever it is deployed.
 *
 * One entry serves one host: mount the plugin once per machine to watch, each
 * row carrying its own `id` and `endpoint`.
 * @module dsh-vps-status
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { formatVpsStatus, parseVpsStatus, VpsStatusFormatError } from './status.ts'

export type { Usage, UsageBytes, VpsStatus } from './status.ts'
export { formatBytes, formatVpsStatus, parseVpsStatus, VpsStatusFormatError } from './status.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-vps-status'

/** Requires the tool registry (`ctx.tools`). */
export const inject = ['tools']

/** Plugin config: which endpoint to read and how long to wait for it. */
export interface Config {
  /**
   * Full URL of the status resource, not a base — it is requested verbatim, so
   * a path is preserved (`https://vps1.example.com/api/status`).
   */
  endpoint: string
  /** Tool name registered on `ctx.tools`; rename it when several hosts are mounted. */
  toolName?: string
  /** Text the model reads to decide when to call the tool. */
  description?: string
  /** Request deadline in milliseconds. */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  endpoint: z.string(),
  toolName: z.string().default('vps_status'),
  description: z.string().default(
    'Read the current disk and memory usage of the server. Takes no arguments. '
    + 'Use it when the user asks how the server is doing, or before an operation that needs free space or memory.',
  ),
  timeoutMs: z.number().default(5_000),
})

/** Complete config after schemastery applies every field default. */
type ResolvedConfig = Required<Config>

/**
 * Reject a malformed endpoint at load rather than on the model's first call.
 * @param endpoint - the configured URL.
 * @returns the parsed URL.
 * @throws Error when the value is not an absolute http(s) URL.
 */
function resolveEndpoint(endpoint: string): URL {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error(`dsh-vps-status: endpoint is not an absolute URL: ${endpoint}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`dsh-vps-status: endpoint must be http(s), got ${url.protocol}`)
  }
  return url
}

/**
 * Reject a non-positive deadline at load; a zero or negative timeout would
 * abort every request before it is sent.
 * @param timeoutMs - the configured deadline.
 * @throws Error when the deadline is not a positive finite number.
 */
function assertTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`dsh-vps-status: timeoutMs must be a positive finite number, got ${timeoutMs}`)
  }
}

/**
 * Register the tool.
 *
 * Failure text is written for its actual reader — the model — so a terminal
 * failure says not to retry. Without that, a plain status code invites the
 * model to call again in a loop.
 * @param ctx - host cordis context carrying the tool registry.
 * @param config - validated plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  const endpoint = resolveEndpoint(resolved.endpoint)
  assertTimeout(resolved.timeoutMs)

  ctx.tools.register(defineTool({
    name: resolved.toolName,
    description: resolved.description,
    parameters: {},
    timeoutMs: resolved.timeoutMs,
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          disk: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              totalBytes: { type: 'number', required: true },
              usedBytes: { type: 'number', required: true },
              usedPct: { type: 'number', required: true },
            },
          },
          memory: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              totalBytes: { type: 'number', required: true },
              usedBytes: { type: 'number', required: true },
              usedPct: { type: 'number', required: true },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: formatVpsStatus(value) }],
    },
    async execute(_args, exec) {
      // The caller's signal carries stop and cancellation; the deadline is
      // this plugin's own. Dropping either would hang the turn or leak a
      // request the harness already abandoned.
      const signal = AbortSignal.any([exec.signal, AbortSignal.timeout(resolved.timeoutMs)])
      let response: Response
      try {
        response = await fetch(endpoint, { signal, headers: { accept: 'application/json' } })
      } catch (error) {
        if (exec.signal.aborted) throw error
        throw new Error(
          `Could not reach the status endpoint (${(error as Error).message}). `
          + 'Tell the user the server is unreachable and do not retry.',
        )
      }
      if (!response.ok) {
        throw new Error(
          `The status endpoint answered ${response.status}. Tell the user and do not retry.`,
        )
      }
      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new Error('The status endpoint did not answer JSON. Tell the user and do not retry.')
      }
      try {
        return parseVpsStatus(body)
      } catch (error) {
        if (error instanceof VpsStatusFormatError) {
          throw new Error(`${error.message}. Tell the user the endpoint is misconfigured and do not retry.`)
        }
        throw error
      }
    },
  }))
}
