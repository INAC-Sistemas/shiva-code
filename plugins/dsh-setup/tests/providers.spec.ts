import { describe, expect, it } from 'vitest'
import { CHAT_PROVIDERS, matchChatProviders } from '../src/providers.ts'

describe('searching the chat providers', () => {
  it('matches the display name, the route id and the kind', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, 'deep').map(entry => entry.provider))
      .toEqual(['deepseek-official'])
    // The route id is what a person copies from documentation; the display
    // name ("Moonshot / Kimi") is what they remember.
    expect(matchChatProviders(CHAT_PROVIDERS, 'moonshotai').map(entry => entry.provider))
      .toEqual(['moonshotai-cn'])
    expect(matchChatProviders(CHAT_PROVIDERS, 'kimi').map(entry => entry.provider))
      .toEqual(['moonshotai-cn'])
    expect(matchChatProviders(CHAT_PROVIDERS, 'agregador').map(entry => entry.provider))
      .toEqual(['openrouter'])
  })

  it('ignores case and surrounding space, and an empty query shows everything', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, '  GROQ ').map(entry => entry.provider)).toEqual(['groq'])
    expect(matchChatProviders(CHAT_PROVIDERS, '   ')).toHaveLength(CHAT_PROVIDERS.length)
  })

  it('keeps the selected provider on screen, because the form below belongs to it', () => {
    const shown = matchChatProviders(CHAT_PROVIDERS, 'groq', 'deepseek-official')
    expect(shown.map(entry => entry.provider)).toEqual(['deepseek-official', 'groq'])
  })

  it('answers empty when nothing matches, rather than falling back to everything', () => {
    expect(matchChatProviders(CHAT_PROVIDERS, 'zzz')).toEqual([])
  })
})
