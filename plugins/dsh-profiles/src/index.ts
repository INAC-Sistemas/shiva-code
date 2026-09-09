/**
 * dsh-profiles host half: the routes behind the profile picker.
 *
 * A profile is the slice an agent runs under — which library skills reach the
 * model, and which plugins load. The plugin manager owns the roster and every
 * rule about it; this plugin MATERIALIZES the selection and forwards authoring.
 * Its create route carries a draft upstream without vetting it: what a valid
 * profile is has one home, and it is the half that stores them. It holds no
 * credential of its own either — every call reads the session `dsh-login`
 * recorded, per request and never cached, the same way `dsh-skill-library` and
 * `dsh-vps-status` do.
 *
 * Scope, stated plainly: which plugins load is a COMPOSITION boundary, not a
 * security one. The enforced half is the server's — a skill outside the active
 * profile is never served to this user's token. This plugin makes the picker's
 * promise true in the transcript; it does not defend the machine against the
 * person using it.
 * @module dsh-profiles
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webserver plugin's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: pulls the credential seam's Context merge (ctx.credentials).
import type {} from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { isSameOriginRequest, resolveLoginAuthorization } from 'dsh-login'
import type { LoginCredentialStore } from 'dsh-login'
import { readActiveProfile, writeActiveProfile } from './active.ts'
import { assertTimeout, resolveEndpoint } from './config.ts'
import {
  CATALOG_ROUTE, CREATE_ROUTE, hostPlaneDiffers, knownPlugins,
  narrowCatalogPlugins, SELECT_ROUTE, STATE_ROUTE,
} from './wire.ts'
import type {
  ActiveProfile, CreateResult, PluginOption, ProfileCatalog, ProfileState,
  ProfileSummary, SelectResult, SkillOption,
} from './wire.ts'

export { ACTIVE_PROFILE_FILE, readActiveProfile, writeActiveProfile } from './active.ts'
export { assertTimeout, resolveEndpoint } from './config.ts'
export {
  CATALOG_ROUTE, CREATE_ROUTE, hostPlaneDiffers, knownPlugins,
  narrowCatalogPlugins, PLUGIN_ROWS, SELECT_ROUTE, STATE_ROUTE,
} from './wire.ts'
export type {
  ActiveProfile, CreateResult, PluginOption, PluginPlane, ProfileCatalog,
  ProfileDraft, ProfileState, ProfileSummary, SelectResult, SkillOption,
} from './wire.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-profiles'

/** Requires the HTTP route registry (`ctx.webServer`). */
export const inject = ['webServer']

/** Plugin config: where the roster lives, and how long to wait for it. */
export interface Config {
  /**
   * Full URL listing the signed-in user's profiles, requested verbatim.
   *
   * Also where a new profile is posted: creating one is a POST on the same
   * collection, so there is no second URL to keep in step with this one.
   */
  profilesEndpoint?: string
  /** Full URL that makes one profile active, requested verbatim. */
  activeEndpoint?: string
  /** Full URL answering the active profile's spec, requested verbatim. */
  specEndpoint?: string
  /** Full URL answering what a new profile can be built from, requested verbatim. */
  catalogEndpoint?: string
  /** Deadline for each forwarded request, in milliseconds. */
  timeoutMs?: number
  /** Harness home; the selection is recorded under it. Defaults to `$DSH_HOME`. */
  dshHome?: string
}

export const Config: z<Config> = z.object({
  profilesEndpoint: z.string().default(''),
  activeEndpoint: z.string().default(''),
  specEndpoint: z.string().default(''),
  catalogEndpoint: z.string().default(''),
  timeoutMs: z.number().default(5_000),
  dshHome: z.string().default(''),
})

/**
 * Largest body this plugin reads.
 *
 * A selection is one id, but a draft carries a name, a description and two
 * lists of ids — still small, and the ceiling is what keeps a runaway client
 * from streaming into the process.
 */
const MAX_BODY_BYTES = 64 * 1024

/** Write one JSON answer; never cached, since every one of them names a session. */
function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': String(Buffer.byteLength(payload)),
  })
  response.end(payload)
}

/**
 * Read a bounded JSON body.
 * @param request - the incoming request.
 * @returns the parsed value, or undefined when the body is too large or malformed.
 */
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer
    size += buffer.byteLength
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

/** The credential store, resolved per call: the seam is optional and may mount after this plugin. */
function credentialStore(ctx: Context): LoginCredentialStore | undefined {
  return ctx.get('credentials') as LoginCredentialStore | undefined
}

/** One authenticated request to the plugin manager. */
async function callUpstream(
  ctx: Context,
  url: URL,
  timeoutMs: number,
  init?: { method: 'POST', body: unknown },
): Promise<{ ok: true, body: unknown } | { ok: false, status: number, message: string }> {
  const authorization = await resolveLoginAuthorization(credentialStore(ctx), Date.now())
  if (!authorization.ok) return { ok: false, status: 401, message: authorization.message }

  const signal = AbortSignal.timeout(timeoutMs)
  let response: Response
  try {
    response = await fetch(url, {
      method: init?.method ?? 'GET',
      signal,
      headers: {
        authorization: authorization.authorization,
        accept: 'application/json',
        ...(init === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(init === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: `the plugin manager could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `the plugin manager answered ${response.status}`
    return { ok: false, status: response.status, message }
  }
  return { ok: true, body }
}

/** Project one roster row, dropping anything the answer did not shape as expected. */
function toSummary(value: unknown): ProfileSummary | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return undefined
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : null,
    pluginCount: typeof row.pluginCount === 'number' ? row.pluginCount : 0,
    skillCount: typeof row.skillCount === 'number' ? row.skillCount : 0,
    revision: typeof row.revision === 'number' ? row.revision : 0,
  }
}

/** Project a selection answer into the record this machine keeps. */
function toActive(value: unknown): ActiveProfile | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const spec = value as Record<string, unknown>
  const profile = spec.profile
  if (typeof profile !== 'object' || profile === null) return undefined
  const row = profile as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return undefined
  return {
    id: row.id,
    name: row.name,
    plugins: knownPlugins(Array.isArray(spec.plugins) ? spec.plugins.filter((p): p is string => typeof p === 'string') : []),
    revision: typeof row.revision === 'number' ? row.revision : 0,
  }
}

/** `GET /profiles/api/state` — the roster plus what this machine materialized. */
function stateHandler(ctx: Context, profilesEndpoint: URL, timeoutMs: number, dshHome: string) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isSameOriginRequest(request)) return writeJson(response, 403, { signedIn: false })

    const upstream = await callUpstream(ctx, profilesEndpoint, timeoutMs)
    if (!upstream.ok) {
      // Not signed in, session expired, or the manager is unreachable. All three
      // leave the picker waiting behind the login gate rather than showing an
      // empty roster that reads as "you have no profiles".
      return writeJson(response, 200, { signedIn: false } satisfies ProfileState)
    }

    const body = upstream.body as { profiles?: unknown, activeId?: unknown }
    const profiles = (Array.isArray(body.profiles) ? body.profiles : [])
      .map(toSummary)
      .filter((row): row is ProfileSummary => row !== undefined)

    writeJson(response, 200, {
      signedIn: true,
      profiles,
      serverActiveId: typeof body.activeId === 'string' ? body.activeId : null,
      active: await readActiveProfile(dshHome),
    } satisfies ProfileState)
  }
}

/** `POST /profiles/api/select` — make one profile active and record the result. */
function selectHandler(ctx: Context, activeEndpoint: URL, timeoutMs: number, dshHome: string) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== 'POST') {
      return writeJson(response, 405, { ok: false, message: 'use POST' } satisfies SelectResult)
    }
    if (!isSameOriginRequest(request)) {
      return writeJson(response, 403, { ok: false, message: 'cross-site request' } satisfies SelectResult)
    }

    const body = await readJsonBody(request)
    const profileId = typeof body === 'object' && body !== null
      ? (body as { profileId?: unknown }).profileId
      : undefined
    if (typeof profileId !== 'string' || profileId === '') {
      return writeJson(response, 400, { ok: false, message: 'profileId is required' } satisfies SelectResult)
    }

    // The id is forwarded, not trusted: the plugin manager checks it against the
    // token's own user before it becomes the active profile, and answers 404 for
    // a profile that is not theirs.
    const upstream = await callUpstream(ctx, activeEndpoint, timeoutMs, { method: 'POST', body: { profileId } })
    if (!upstream.ok) {
      return writeJson(response, upstream.status, { ok: false, message: upstream.message } satisfies SelectResult)
    }

    const active = toActive(upstream.body)
    if (active === undefined) {
      return writeJson(response, 502, {
        ok: false,
        message: 'the plugin manager answered a profile this build cannot read',
      } satisfies SelectResult)
    }

    const previous = await readActiveProfile(dshHome)
    await writeActiveProfile(dshHome, active)

    writeJson(response, 200, {
      ok: true,
      active,
      restartRequired: hostPlaneDiffers(previous?.plugins, active.plugins),
    } satisfies SelectResult)
  }
}

/** Project one catalog plugin row, dropping anything shaped unexpectedly. */
function toPluginOption(value: unknown): PluginOption | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.label !== 'string') return undefined
  return {
    id: row.id,
    label: row.label,
    hint: typeof row.hint === 'string' ? row.hint : '',
    // Overwritten by narrowCatalogPlugins from this build's own table; the
    // answer never decides what loading a row costs.
    plane: 'agent',
  }
}

/** Project one catalog skill row, dropping anything shaped unexpectedly. */
function toSkillOption(value: unknown): SkillOption | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return undefined
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : '',
  }
}

/** `GET /profiles/api/catalog` — what a new profile can be built from. */
function catalogHandler(ctx: Context, catalogEndpoint: URL, timeoutMs: number) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isSameOriginRequest(request)) {
      return writeJson(response, 403, { plugins: [], skills: [] } satisfies ProfileCatalog)
    }

    const upstream = await callUpstream(ctx, catalogEndpoint, timeoutMs)
    if (!upstream.ok) return writeJson(response, upstream.status, { error: upstream.message })

    const body = upstream.body as { plugins?: unknown, skills?: unknown }
    const plugins = (Array.isArray(body.plugins) ? body.plugins : [])
      .map(toPluginOption)
      .filter((row): row is PluginOption => row !== undefined)

    writeJson(response, 200, {
      // The narrowing is the point of forwarding this at all: a row this build
      // cannot compose must never reach the form, or the person would tick a
      // box that selects nothing.
      plugins: narrowCatalogPlugins(plugins),
      skills: (Array.isArray(body.skills) ? body.skills : [])
        .map(toSkillOption)
        .filter((row): row is SkillOption => row !== undefined),
    } satisfies ProfileCatalog)
  }
}

/** `POST /profiles/api/create` — author one profile, without selecting it. */
function createHandler(ctx: Context, profilesEndpoint: URL, timeoutMs: number) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== 'POST') {
      return writeJson(response, 405, { ok: false, message: 'use POST' } satisfies CreateResult)
    }
    if (!isSameOriginRequest(request)) {
      return writeJson(response, 403, { ok: false, message: 'cross-site request' } satisfies CreateResult)
    }

    const body = await readJsonBody(request)
    if (typeof body !== 'object' || body === null) {
      return writeJson(response, 400, { ok: false, message: 'a draft is required' } satisfies CreateResult)
    }

    // Forwarded as received, not vetted here: the plugin manager owns what a
    // valid profile is, and it is the half that must refuse a bad one anyway —
    // re-stating the rules in the shell would only let the two drift.
    const upstream = await callUpstream(ctx, profilesEndpoint, timeoutMs, { method: 'POST', body })
    if (!upstream.ok) {
      return writeJson(response, upstream.status, { ok: false, message: upstream.message } satisfies CreateResult)
    }

    const created = toSummary((upstream.body as { profile?: unknown } | undefined)?.profile)
    if (created === undefined) {
      return writeJson(response, 502, {
        ok: false,
        message: 'the plugin manager answered a profile this build cannot read',
      } satisfies CreateResult)
    }

    writeJson(response, 201, { ok: true, profile: created } satisfies CreateResult)
  }
}

/**
 * Register the routes.
 * @param ctx - the host cordis context.
 * @param config - the validated plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = config as Required<Config>
  const profilesEndpoint = resolveEndpoint('profilesEndpoint', resolved.profilesEndpoint)
  const activeEndpoint = resolveEndpoint('activeEndpoint', resolved.activeEndpoint)
  const catalogEndpoint = resolveEndpoint('catalogEndpoint', resolved.catalogEndpoint)
  // Validated at load even though only the client reads it: a broken spec URL
  // must fail with an operator watching, not the first time someone signs in.
  resolveEndpoint('specEndpoint', resolved.specEndpoint)
  const timeoutMs = assertTimeout('timeoutMs', resolved.timeoutMs)
  const dshHome = resolveDshHome(resolved.dshHome === '' ? undefined : resolved.dshHome)

  if (ctx.get('credentials') === undefined) {
    ctx.logger?.warn(
      'dsh-profiles: no credential service is mounted yet; the picker stays behind the login gate until dsh-login records a session',
    )
  }

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: STATE_ROUTE,
      handler: stateHandler(ctx, profilesEndpoint, timeoutMs, dshHome),
    }),
    `dsh-profiles: ${STATE_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: SELECT_ROUTE,
      handler: selectHandler(ctx, activeEndpoint, timeoutMs, dshHome),
    }),
    `dsh-profiles: ${SELECT_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: CATALOG_ROUTE,
      handler: catalogHandler(ctx, catalogEndpoint, timeoutMs),
    }),
    `dsh-profiles: ${CATALOG_ROUTE} route`,
  )
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: CREATE_ROUTE,
      handler: createHandler(ctx, profilesEndpoint, timeoutMs),
    }),
    `dsh-profiles: ${CREATE_ROUTE} route`,
  )
}
