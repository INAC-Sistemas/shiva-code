/**
 * The providers each wizard step offers.
 *
 * The chat list names routes; a route only reaches the wizard when an LLM
 * adapter declares it configurable, so an entry this harness cannot serve is
 * dropped by the host rather than shown. The memory presets mirror the ones
 * `dsh-openviking`'s own Memory tab offers, so the two surfaces write the same
 * settings.
 *
 * This module must stay free of Node.js and React value imports: the browser
 * bundle compiles it.
 * @module dsh-setup/providers
 */
import type { ImageProvider } from './wire.ts'

/** One chat route offered, in display order. */
export interface ChatProviderEntry {
  provider: string
  displayName: string
  kind: string
}

/** Chat routes the first step offers, most common first. */
export const CHAT_PROVIDERS: readonly ChatProviderEntry[] = [
  { provider: 'deepseek-official', displayName: 'DeepSeek', kind: 'Fabricante' },
  { provider: 'openai', displayName: 'OpenAI', kind: 'Fabricante' },
  { provider: 'anthropic', displayName: 'Anthropic', kind: 'Fabricante' },
  { provider: 'google', displayName: 'Google Gemini', kind: 'Fabricante' },
  { provider: 'openrouter', displayName: 'OpenRouter', kind: 'Agregador' },
  { provider: 'xai', displayName: 'xAI', kind: 'Fabricante' },
  { provider: 'moonshotai-cn', displayName: 'Moonshot / Kimi', kind: 'Fabricante' },
  { provider: 'minimax-cn', displayName: 'MiniMax', kind: 'Fabricante' },
  { provider: 'zai-coding-cn', displayName: 'Zhipu GLM', kind: 'Fabricante' },
  { provider: 'mistral', displayName: 'Mistral AI', kind: 'Fabricante' },
  { provider: 'groq', displayName: 'Groq', kind: 'Inferência' },
  { provider: 'together', displayName: 'Together AI', kind: 'Inferência' },
]

/** One route the LLM runtime reports as configurable. */
export interface ConfigurableRoute {
  provider: string
  displayName: string
  /** Absent when the adapter draws no distinction; true for a route only configuration declared. */
  declared?: boolean
}

/** Shown under the name of a route the curated list does not describe. */
const DECLARED_KIND = 'Configurado aqui'
const OTHER_KIND = 'Disponível'

/**
 * Every provider the wizard offers: the curated ones first, then every other
 * route this installation can serve.
 *
 * The curated entries carry names and groupings a person recognizes, and their
 * order is the order they are offered in. Everything else the LLM runtime
 * reports as configurable follows, by name — including a route configuration
 * declared by hand, such as a self-hosted Ollama. Leaving those out made the
 * Models page and this step disagree: a route someone configured there could
 * not be chosen here.
 * @param curated - the wizard's own catalog, in display order.
 * @param routes - what the runtime reports as configurable.
 * @returns the providers to offer, curated first.
 */
export function offeredChatProviders(
  curated: readonly ChatProviderEntry[],
  routes: readonly ConfigurableRoute[],
): ChatProviderEntry[] {
  const byRoute = new Map(routes.map(route => [route.provider, route]))
  const offered = curated.filter(entry => byRoute.has(entry.provider))
  const known = new Set(offered.map(entry => entry.provider))
  const rest = routes
    .filter(route => !known.has(route.provider))
    .map(route => ({
      provider: route.provider,
      displayName: route.displayName === '' ? route.provider : route.displayName,
      kind: route.declared === true ? DECLARED_KIND : OTHER_KIND,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
  return [...offered, ...rest]
}

/**
 * Narrow the provider list by what the person typed.
 *
 * The query matches the display name, the route id and the kind, so "kimi",
 * "moonshotai" and "agregador" all reach something. The current selection
 * always survives: it is what the key field and the model list below belong
 * to, and a filter must not leave the form pointing at a provider that is no
 * longer on screen.
 * @param providers - every provider this installation offers.
 * @param query - the raw search text.
 * @param selected - the provider the form is currently filled for, if any.
 * @returns the providers to show, in their original order.
 */
export function matchChatProviders<T extends { provider: string, displayName: string, kind: string }>(
  providers: readonly T[],
  query: string,
  selected?: string,
): T[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...providers]
  return providers.filter(candidate => candidate.provider === selected
    || candidate.displayName.toLowerCase().includes(needle)
    || candidate.provider.toLowerCase().includes(needle)
    || candidate.kind.toLowerCase().includes(needle))
}

/** Settings namespace whose adapter serves hand-declared routes. */
export const PI_AI_NS = 'llm-pi-ai'

/**
 * Wire protocol a custom route speaks. One protocol, not a choice: every
 * server someone points this wizard at — Ollama, LM Studio, vLLM, a gateway —
 * answers the OpenAI completions shape, and a protocol picker on the first
 * screen would ask for a decision nobody arrives with. The Models page still
 * edits the field for the rest.
 */
export const CUSTOM_API = 'openai-completions'

/**
 * What a route stores as its key when the endpoint asks for none.
 *
 * A route naming no credential resolves as configured-but-keyless, and pi-ai's
 * OpenAI-compatible implementation then refuses it with `No API key for
 * provider` before any request leaves: that protocol requires an API key or an
 * `Authorization` header ([llm-pi-ai](../../../packages/llm/llm-pi-ai/README.md)).
 * A stored placeholder is what the Models page writes for a local server too,
 * and it keeps the value inside the credential seam, where the redactor can
 * see it, instead of in profile `headers`, where it cannot. Servers that take
 * no key ignore the value.
 */
export const KEYLESS_PLACEHOLDER = 'local'

/**
 * The route id derived from what the person named their provider.
 *
 * Lowercase, with runs of anything else collapsed into single dashes and the
 * edges trimmed, so "Meu Ollama (casa)" becomes `meu-ollama-casa`. The id is
 * what the settings document, the credential reference and the model selection
 * all key on, which is why it is derived once, here.
 * @param displayName - what the person typed.
 * @returns the route id, or an empty string when nothing usable remains.
 */
export function customRouteId(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Derive the credential reference a route stores its key under when its
 * settings profile names none — the same rule the Models page applies, so a key
 * saved here is the one that page shows as configured.
 * @param provider - provider route id (e.g. `minimax-cn`).
 * @returns the reference (e.g. `MINIMAX_CN_API_KEY`).
 */
export function deriveKeyRef(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}

/** One image provider offered. */
export interface ImageProviderEntry {
  provider: ImageProvider
  label: string
  hint: string
}

/** Image providers `dsh-assets` generates through. */
export const IMAGE_PROVIDERS: readonly ImageProviderEntry[] = [
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    hint: 'Uma chave para vários modelos de imagem (ex.: google/gemini-2.5-flash-image).',
  },
  {
    provider: 'fal',
    label: 'fal.ai',
    hint: 'Modelos FLUX e Recraft. A chave é conferida na primeira geração.',
  },
]

/** One OpenViking endpoint preset. */
export interface MemoryPreset {
  provider: string
  label: string
  /** Prefilled base URL; empty means the person types one. */
  base: string
  /** Whether the endpoint takes a key at all. */
  needsKey: boolean
  hint: string
}

/** Endpoint presets for the memory step. */
export const MEMORY_PRESETS: readonly MemoryPreset[] = [
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    needsKey: true,
    hint: 'Embedding e VLM com a mesma chave (ex.: openai/text-embedding-3-small).',
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    needsKey: true,
    hint: 'text-embedding-3-small e gpt-4o-mini como VLM.',
  },
  {
    provider: 'volcengine',
    label: 'Volcengine (Doubao)',
    base: 'https://ark.cn-beijing.volces.com/api/v3',
    needsKey: true,
    hint: 'Cota gratuita inicial.',
  },
  {
    provider: 'ollama',
    label: 'Ollama (local)',
    base: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    hint: 'Sem custo e sem rede (ex.: nomic-embed-text). O Ollama precisa estar rodando.',
  },
  {
    provider: 'custom',
    label: 'Outro (compatível com OpenAI)',
    base: '',
    needsKey: true,
    hint: 'Qualquer endpoint compatível com a API da OpenAI.',
  },
]
