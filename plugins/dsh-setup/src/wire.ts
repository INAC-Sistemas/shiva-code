/**
 * The HTTP contract between the wizard and this plugin's host half.
 *
 * Every route is a same-origin `POST` under {@link API_PREFIX} carrying JSON.
 * A failure always answers `{ ok: false, message }`, with the message written
 * for the person reading the wizard — it is shown verbatim under the step.
 *
 * This module must stay free of Node.js and React value imports: the browser
 * bundle compiles it.
 * @module dsh-setup/wire
 */

/** Prefix every wizard route lives under. */
export const API_PREFIX = '/setup/api'

/** `POST` — {@link SetupState}. */
export const STATE_ROUTE = `${API_PREFIX}/state`
/** `POST` — {@link ChatProvidersResult}. */
export const CHAT_PROVIDERS_ROUTE = `${API_PREFIX}/chat/providers`
/** `POST {provider}` — {@link ModelsResult}. */
export const CHAT_MODELS_ROUTE = `${API_PREFIX}/chat/models`
/** `POST` {@link ChatConnectRequest} — {@link OkResult}. */
export const CHAT_CONNECT_ROUTE = `${API_PREFIX}/chat/connect`
/** `POST` {@link ImageConnectRequest} — {@link OkResult}. */
export const IMAGE_CONNECT_ROUTE = `${API_PREFIX}/image/connect`
/** `POST` {@link MemoryTestRequest} — {@link MemoryTestResult}. */
export const MEMORY_TEST_ROUTE = `${API_PREFIX}/memory/test`
/** `POST` {@link CompleteRequest} — {@link OkResult}. */
export const COMPLETE_ROUTE = `${API_PREFIX}/complete`

/** The credential references the image step may write; nothing else is writable through this plugin. */
export const IMAGE_KEY_REFS = {
  openrouter: 'OPENROUTER_API_KEY',
  fal: 'FAL_KEY',
} as const

/** An image provider `dsh-assets` generates through. */
export type ImageProvider = keyof typeof IMAGE_KEY_REFS

/** What the person decided about the optional OpenViking memory. */
export type MemoryChoice = 'configured' | 'skipped'

/** A refusal, carrying the text the wizard shows. */
export interface FailureResult {
  ok: false
  message: string
}

/** A write or probe that succeeded. */
export type OkResult = { ok: true } | FailureResult

/** The persisted completion marker (`shiva-setup` in `settings.yaml`). */
export interface SetupMarker {
  /** The wizard version last finished on this machine, or null when never. */
  completedVersion: string | null
  /** The memory step's outcome at that time, or null when it was not offered. */
  openviking: MemoryChoice | null
}

/** Everything the gate needs from the host to decide whether to open. */
export interface SetupState {
  ok: true
  chat: {
    /** Whether the default chat route is registered and holds the credential it names. */
    ready: boolean
    provider: string | null
    model: string | null
  }
  /** Which image credentials resolve, keyed by provider. */
  imageKeys: Record<ImageProvider, boolean>
  marker: SetupMarker
}

/** One chat provider the wizard offers. */
export interface ChatProviderOption {
  provider: string
  displayName: string
  /** Grouping label shown under the name. */
  kind: string
  /** Whether a credential for this route already resolves. */
  configured: boolean
}

/** Answer of {@link CHAT_PROVIDERS_ROUTE}. */
export type ChatProvidersResult = { ok: true, providers: ChatProviderOption[] } | FailureResult

/** One model a provider offers. */
export interface ModelOption {
  id: string
  name?: string
}

/** Answer of {@link CHAT_MODELS_ROUTE}. */
export type ModelsResult = { ok: true, models: ModelOption[] } | FailureResult

/** Body of {@link CHAT_CONNECT_ROUTE}. */
export interface ChatConnectRequest {
  provider: string
  model: string
  /** A new key; absent or empty keeps the stored one. */
  apiKey?: string
}

/** Body of {@link IMAGE_CONNECT_ROUTE}. */
export interface ImageConnectRequest {
  provider: ImageProvider
  /** A new key; absent or empty keeps the stored one. */
  apiKey?: string
}

/** One OpenAI-compatible endpoint the memory step probes. */
export interface EndpointDraft {
  /** OpenViking provider id (`openrouter`, `openai`, `volcengine`, `ollama`, `custom`). */
  provider: string
  /** Base URL ending before `/embeddings` or `/chat/completions`. */
  api_base: string
  /** A typed key; empty means the stored OpenRouter key, or none. */
  api_key?: string
  model: string
}

/** Body of {@link MEMORY_TEST_ROUTE}. */
export interface MemoryTestRequest {
  embedding: EndpointDraft
  vlm?: EndpointDraft
}

/** Answer of {@link MEMORY_TEST_ROUTE}: the embedding width the endpoint produced. */
export type MemoryTestResult = { ok: true, dimension: number } | FailureResult

/** Body of {@link COMPLETE_ROUTE}. */
export interface CompleteRequest {
  openviking: MemoryChoice | null
}
