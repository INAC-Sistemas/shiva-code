/**
 * dsh-skill-library: contributes the plugin manager's shared skill library to
 * `ctx.skills`, authenticated as the signed-in user.
 *
 * Host-only by design — the package declares no `dsh.client`, so nothing of this
 * plugin reaches a browser. It adds a fourth provider alongside the local
 * filesystem, the packaged badge and the runtime one; the registry and the
 * `skill` tool are untouched and cannot tell the difference.
 *
 * The bodies never touch disk. They are fetched per load, held for the length of
 * the call, and reach the session only where every skill body already does — the
 * tool result. With nobody signed in the library contributes nothing, and a body
 * cannot be loaded at all.
 *
 * `dsh-login` must be mounted in the same profile: this plugin has no credential
 * of its own and reads the session that plugin records.
 * @module dsh-skill-library
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the credential seam's Context merge (ctx.credentials).
import type {} from '@deepseek-ai/dsh-credentials'
// Type-only: pulls the skill seam's Context merge (ctx.skills).
import type {} from '@deepseek-ai/dsh-skill'
import z from '@deepseek-ai/schemastery'
import { loginRecordKey, resolveLoginAuthorization } from 'dsh-login/vps-auth'
import {
  assertHeaders,
  assertMaxBodyBytes,
  assertRank,
  assertTimeout,
  resolveEndpoint,
} from './config.ts'
import { LibrarySkillProvider } from './provider.ts'

export { LibrarySkillProvider, type ProviderOptions } from './provider.ts'
export {
  parseCatalog,
  parseSkill,
  SkillLibraryFormatError,
  type WireSkill,
  type WireSummary,
} from './wire.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-skill-library'

/** Requires the skill registry (`ctx.skills`). */
export const inject = ['skills']

/**
 * Rank of every library candidate.
 *
 * Below the strongest local root (`project-dsh` is 100), so a file dropped in a
 * workspace cannot silently take over a library skill's name. The shipped
 * process skills are addressed by guessable names, and a same-named local file
 * would replace audited instructions with arbitrary ones while the catalog still
 * showed the original description.
 *
 * The cost is that those names cannot be shadowed locally at all; forking one
 * means renaming it. A deployment that wants the opposite policy sets `rank`.
 */
export const LIBRARY_SKILL_RANK = 50

/** Plugin config: where the library is and how the provider identifies itself. */
export interface Config {
  /**
   * Base URL of the library's plugin routes, e.g.
   * `https://vps/api/plugins/skill-library`. Sub-paths are appended to it.
   * Plain http is refused off loopback.
   */
  endpoint: string
  /** Provider name in the `ctx.skills` registry; unique per layer. */
  providerName?: string
  /** `source` reported on every candidate. Prompt-visible metadata. */
  source?: string
  /** Rank of every candidate; see {@link LIBRARY_SKILL_RANK}. */
  rank?: number
  /**
   * Deadline for the catalog request. Short on purpose: discovery runs on the
   * agent's step boundary, so an unreachable library delays every step by this
   * much before the provider gives up.
   */
  listTimeoutMs?: number
  /**
   * Deadline for loading one body. Longer than the catalog's: this one is an
   * explicit request from the model, not a background refresh.
   */
  getTimeoutMs?: number
  /** Largest response accepted, in bytes. */
  maxBodyBytes?: number
  /**
   * Static headers added to every request (a gateway key, a tenant id).
   * `authorization` is rejected: it carries the signed-in user's session and has
   * one source.
   */
  headers?: Record<string, string>
}

export const Config: z<Config> = z.object({
  endpoint: z.string(),
  providerName: z.string().default('library'),
  source: z.string().default('library'),
  rank: z.number().default(LIBRARY_SKILL_RANK),
  listTimeoutMs: z.number().default(2_000),
  getTimeoutMs: z.number().default(10_000),
  maxBodyBytes: z.number().default(512 * 1024),
  headers: z.dict(z.string()).default({}),
})

/** Complete config after schemastery applies every field default. */
type ResolvedConfig = Required<Config>

/**
 * Register the provider.
 *
 * Every config check runs here rather than on the first lookup: a provider that
 * throws during discovery is warned and skipped, so a bad endpoint would show up
 * as skills that quietly never appear.
 * @param ctx - host cordis context carrying the skill registry.
 * @param config - validated plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  const endpoint = resolveEndpoint(resolved.endpoint)
  assertTimeout(resolved.listTimeoutMs, 'listTimeoutMs')
  assertTimeout(resolved.getTimeoutMs, 'getTimeoutMs')
  assertRank(resolved.rank)
  assertMaxBodyBytes(resolved.maxBodyBytes)
  assertHeaders(resolved.headers)

  const sessionKey = String(loginRecordKey())

  ctx.skills.registerProvider((control) => {
    // A signed-in catalog is cacheable, so without this the registry would keep
    // serving it after a sign-out until something else invalidated. Invalidating
    // on the session record makes signing in and out both reach the next step:
    // the catalog gains the library's skills, or loses them.
    ctx.on('credentials/record-updated', (key: string) => {
      if (key === sessionKey) control.invalidate()
    })

    return new LibrarySkillProvider({
      endpoint,
      providerName: resolved.providerName,
      source: resolved.source,
      rank: resolved.rank,
      listTimeoutMs: resolved.listTimeoutMs,
      getTimeoutMs: resolved.getTimeoutMs,
      maxBodyBytes: resolved.maxBodyBytes,
      headers: resolved.headers,
      authorize: store => resolveLoginAuthorization(store, Date.now()),
      // Read per call, not captured: the credential seam is optional and may
      // mount after this plugin.
      store: () => ctx.get('credentials'),
      warn: message => { ctx.logger?.warn?.(`dsh-skill-library: ${message}`) },
    })
  })

  // Named at load because the two failure modes look identical from the chat:
  // skills that never appear are either this endpoint being wrong or nobody
  // being signed in, and only the log separates them.
  console.log(`[dsh-skill-library] skills from ${endpoint.href} (rank ${resolved.rank})`)
}
