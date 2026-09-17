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
