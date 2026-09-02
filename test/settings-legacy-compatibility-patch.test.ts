import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('@deepseek-ai/dsh-settings backward compatibility patch', () => {
  it('re-exports legacy settingsNamespace, installSettingsSection, and deepEqualJson for third-party plugins', async () => {
    const patch = await readFile(
      'patches/@deepseek-ai+dsh-settings+0.1.2-alpha.4.patch',
      'utf8'
    )

    expect(patch).toContain('function installSettingsSection(ctx, ns, schema, entry, hooks)')
    expect(patch).toContain('const settingsNamespace = parseSettingsNamespace;')
    expect(patch).toContain('settingsNamespace, installSettingsSection, deepEqualJson')
  })

  it('exports the functions at runtime from the installed package', async () => {
    const dshSettings = await import('@deepseek-ai/dsh-settings')

    expect(typeof dshSettings.settingsNamespace).toBe('function')
    expect(typeof dshSettings.installSettingsSection).toBe('function')
    expect(typeof dshSettings.deepEqualJson).toBe('function')
    expect(typeof dshSettings.parseSettingsNamespace).toBe('function')

    expect(dshSettings.settingsNamespace('test-ns')).toBe('test-ns')
    expect(() => dshSettings.settingsNamespace('Invalid_NS')).toThrow(/settings namespace/)
  })
})
