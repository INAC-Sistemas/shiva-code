import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('opening a plugin tab expands a collapsed sidebar', () => {
  it('better-sidebar expands the panel for a type-only open that sets expand', async () => {
    for (const chunk of ['client.js', 'client-registry.js']) {
      const source = await read(`../node_modules/dsh-better-sidebar/lib/${chunk}`)
      expect(source, chunk).toContain('seed.path !== void 0 || seed.url !== void 0 || seed.expand === true')
    }
    expect(await read('../node_modules/dsh-better-sidebar/lib/types/client/service.d.ts')).toContain('expand?: boolean;')
  })

  it('every automatic or agent-requested open asks for it', async () => {
    const sidebar = await read('../node_modules/dsh-sidebar/lib/client.js')
    expect(sidebar).toContain("const seed = { type: String(cmd.type ?? ''), expand: true }")
    expect(sidebar).toContain('betterSidebar.openTab({ type: event.tab, expand: true')
    expect(await read('../node_modules/dsh-palette/lib/client.js')).toContain('betterSidebar.openTab({ type: TAB_ID, expand: true }')
    expect(await read('../node_modules/dsh-prototype/lib/client.js')).toContain('sidebarService.openTab({ type: TAB_ID, expand: true }')
  })
})
