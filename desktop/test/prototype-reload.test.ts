import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, new URL('../../', import.meta.url)), 'utf8')

describe('prototype_automation reload and navigate', () => {
  it('navigate and reload both change the iframe URL, so an edited file is loaded again', async () => {
    const client = await read('plugins/dsh-prototype/lib/client.js')
    expect(client).toContain("src: fileBase + currentPath + (loadNonce ? '?t=' + loadNonce : '')")
    const navigate = client.slice(client.indexOf("if (op === 'navigate') {"), client.indexOf("if (op === 'reload') {"))
    expect(navigate).toContain('setLoadNonce(Date.now())')
    const reload = client.slice(client.indexOf("if (op === 'reload') {"), client.indexOf("if (op === 'screenshot') {"))
    expect(reload).toContain('setLoadNonce(Date.now())')
  })

  it('is an op every layer accepts: the tool and the library queue', async () => {
    expect(await read('plugins/dsh-prototype/lib/index.js')).toMatch(/INTERACTIVE_OPS = \[[^\]]*'reload'/)
    expect(await read('plugin-manager/plugins/prototype/index.ts')).toContain('"reload",')
  })
})
