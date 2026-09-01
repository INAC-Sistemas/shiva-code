import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  LOCALE_SETTINGS_NAMESPACE, apply,
} from '@deepseek-ai/dsh-client-locale'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

describe('locale host', () => {
  it('registers an optional explicit locale preference with the Host settings lifecycle', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(LOCALE_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual({})
    await ctx.settings.update(ns, { preference: 'en' })
    expect(ctx.settings.get(ns)).toEqual({ preference: 'en' })
    // A locale a plugin ships is storable: the Host writes this document
    // without knowing which plugins the browser composition loaded, so the
    // durable field cannot be a union of the client's own locales. Standing
    // aside from an id nothing registers is the browser runtime's job.
    await ctx.settings.update(ns, { preference: 'pt-BR' })
    expect(ctx.settings.get(ns)).toEqual({ preference: 'pt-BR' })
    // The field is still typed: only its value set opened up.
    await expect(ctx.settings.update(ns, { preference: 7 } as never)).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })
})
