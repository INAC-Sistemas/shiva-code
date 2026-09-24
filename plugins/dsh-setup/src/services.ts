/**
 * Structural faces of the host services the wizard drives.
 *
 * The desktop app runs a packaged harness that lags this repository, so the
 * plugin does not import the upstream service types: it names only the members
 * it calls, which exist with these signatures in both. Drift from upstream is
 * contained to this file.
 * @module dsh-setup/services
 */

/** One path edit on a settings section. */
export type SettingsPathOp =
  | { op: 'set', path: readonly string[], value: unknown }
  | { op: 'unset', path: readonly string[] }

/** The owner scope a settings registration returns. */
export interface SettingsScopeFace<T> {
  get(): T
  update(patch: object): Promise<void>
}

/** `ctx.settings`. */
export interface SettingsFace {
  /** The resolved value of a registered namespace, or undefined. */
  get(ns: string): unknown
  mutate(ns: string, ops: readonly SettingsPathOp[]): Promise<void>
}

/** `ctx.credentials`. */
export interface CredentialsFace {
  resolve(ref: string): Promise<{ value: string, source: string } | undefined>
  describe(ref: string): Promise<{ configured: boolean, writable: boolean, source?: string }>
  set(ref: string, value: string): Promise<void>
  unset(ref: string): Promise<void>
}

/** One configurable chat route from the LLM directory. */
export interface ConfigurableProvider {
  provider: string
  displayName: string
  settingsNs: string
  settingsPath: readonly string[]
}

/** The terminal chunk of a model stream; every other chunk is ignored here. */
export interface FinishChunk {
  type: 'finish'
  reason: { kind: string, failure?: { message: string } }
}

/** The options of the one-request probe. */
export interface ProbeRequest {
  provider: string
  model: string
  messages: unknown[]
  maxTokens: number
  signal: AbortSignal
}

/** `ctx.llm`. */
export interface LlmFace {
  listProviders(): Array<{ id: string, name: string }>
  listConfigurableProviders(): ConfigurableProvider[]
  discoverModels(settingsNs: string, request: { provider: string }): Promise<Array<{ id: string, name?: string }>>
  listModels(provider: string): Promise<Array<{ id: string, name: string }>>
  stream(options: ProbeRequest): AsyncIterable<{ type: string }>
}

/** `ctx.agentDefaultModel`. */
export interface DefaultModelFace {
  currentSelection(): { provider: string, model: string }
  saveSelection(next: { provider: string, model: string }): Promise<void>
}

/**
 * The services one request reads. Each getter is called per request, because
 * every one of them may mount after this plugin or be replaced by a reload.
 */
export interface SetupServices {
  settings(): SettingsFace | undefined
  credentials(): CredentialsFace | undefined
  llm(): LlmFace | undefined
  defaultModel(): DefaultModelFace | undefined
  /** The `shiva-setup` scope while a settings service is mounted. */
  marker(): SettingsScopeFace<StoredMarker> | undefined
}

/** The `shiva-setup` section as stored. */
export interface StoredMarker {
  completedVersion?: string
  openviking?: 'configured' | 'skipped'
}
