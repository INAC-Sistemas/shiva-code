/**
 * dsh-setup host half: the routes behind the first-run setup wizard.
 *
 * The wizard (the client half) covers the app until every tool that needs a
 * model is configured: the chat model, the image generator, and — when the
 * active profile loads it — the optional OpenViking memory. This half tests
 * each key and stores what it owns; see {@link createSetupHandler} for where
 * every value goes. The only state it introduces is the completion marker, the
 * `shiva-setup` section of this machine's `settings.yaml`.
 * @module dsh-setup
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webserver plugin's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import { createSetupHandler } from './handler.ts'
import type {
  CredentialsFace, DefaultModelFace, LlmFace, SettingsFace, SettingsScopeFace, StoredMarker,
} from './services.ts'
import { API_PREFIX } from './wire.ts'

export { createSetupHandler } from './handler.ts'
export type { HandlerOptions } from './handler.ts'
export { planSetup, SETUP_VERSION } from './plan.ts'
export type { SetupFacts, SetupPlan, StepId } from './plan.ts'
export { CHAT_PROVIDERS, deriveKeyRef, IMAGE_PROVIDERS, MEMORY_PRESETS } from './providers.ts'
export {
  isHttpUrl, joinUrl, probeChat, probeCompletion, probeEmbedding, probeOpenRouterKey,
} from './probes.ts'
export type { FetchLike, ProbeResult } from './probes.ts'
export type * from './services.ts'
export * from './wire.ts'

/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
export const name = 'dsh-setup'

/** Requires the HTTP route registry; every other service is read per request. */
export const inject = ['webServer']

/** The settings namespace holding the completion marker. */
export const MARKER_NAMESPACE = 'shiva-setup'

/** Schema of the completion marker section. */
export const MARKER_SCHEMA: z<StoredMarker> = z.object({
  completedVersion: z.string(),
  openviking: z.union(['configured', 'skipped'] as const),
})

/** Plugin config. */
export interface Config {
  /** Deadline of each key test, in milliseconds. */
  timeoutMs?: number
  /** How long a chat route declared by the wizard may take to register, in milliseconds. */
  routeWaitMs?: number
  /** OpenRouter API base the image key is checked against. */
  openrouterBaseUrl?: string
}

export const Config: z<Config> = z.object({
  timeoutMs: z.number().default(30_000),
  routeWaitMs: z.number().default(5_000),
  openrouterBaseUrl: z.string().default('https://openrouter.ai/api/v1'),
})

/**
 * Check a positive millisecond count at load.
 * @param label - the config field.
 * @param value - the configured value.
 * @returns the value.
 * @throws Error when it is not a positive safe integer.
 */
function assertMilliseconds(label: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`dsh-setup: ${label} must be a positive integer, got ${value}`)
  }
  return value
}

/**
 * Check the OpenRouter base at load.
 * @param value - the configured URL.
 * @returns the URL without a trailing slash.
 * @throws Error when it is not an absolute https URL.
 */
function assertHttpsBase(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`dsh-setup: openrouterBaseUrl is not an absolute URL: ${value}`)
  }
  if (url.protocol !== 'https:') {
    throw new Error(`dsh-setup: openrouterBaseUrl must be https, got ${url.protocol} — the key under test travels on it`)
  }
  return value.replace(/\/+$/, '')
}

/**
 * Register the completion marker section and the wizard routes.
 * @param ctx - the host cordis context.
 * @param config - the validated plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = config as Required<Config>
  const timeoutMs = assertMilliseconds('timeoutMs', resolved.timeoutMs)
  const routeWaitMs = assertMilliseconds('routeWaitMs', resolved.routeWaitMs)
  const openrouterBaseUrl = assertHttpsBase(resolved.openrouterBaseUrl)

  let marker: SettingsScopeFace<StoredMarker> | undefined
  ctx.inject(['settings'], (sctx) => {
    // The registration rides this scoped fiber, so a settings provider that
    // goes away takes the section with it, and the routes answer 503 until
    // the next one mounts.
    const settings = sctx.get('settings') as unknown as {
      register(ns: string, schema: z<StoredMarker>): SettingsScopeFace<StoredMarker>
    }
    marker = settings.register(MARKER_NAMESPACE, MARKER_SCHEMA)
    sctx.effect(() => () => { marker = undefined }, 'dsh-setup: marker scope')
  })

  const read = <T>(service: string): T | undefined => ctx.get(service) as unknown as T | undefined

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: createSetupHandler({
        settings: () => read<SettingsFace>('settings'),
        credentials: () => read<CredentialsFace>('credentials'),
        llm: () => read<LlmFace>('llm'),
        defaultModel: () => read<DefaultModelFace>('agentDefaultModel'),
        marker: () => marker,
      }, {
        timeoutMs,
        routeWaitMs,
        openrouterBaseUrl,
        fetch: (url, init) => fetch(url, init),
      }),
    }),
    `dsh-setup: ${API_PREFIX} routes`,
  )
}
