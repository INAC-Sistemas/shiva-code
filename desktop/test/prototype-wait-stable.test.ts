import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

type Stable = { stable: boolean, quietMs: number, elapsedMs: number }
type PageOps = { ops: { wait_stable: (a: { quietMs?: number, timeoutMs?: number }) => Promise<Stable> } }

const REPO = new URL('../../', import.meta.url)

/**
 * The prototype shim's page ops, evaluated against a stand-in DOM: a document
 * with a readyState and a MutationObserver the test can fire.
 */
async function pageOps(readyState = 'complete') {
  const { pageOpsExpression } = (await import(
    /* @vite-ignore */ new URL('plugins/dsh-prototype/lib/shim.js', REPO).href
  )) as { pageOpsExpression: () => string }
  const observers: Array<() => void> = []
  class FakeMutationObserver {
    constructor(private readonly callback: () => void) {}
    observe() { observers.push(this.callback) }
    disconnect() { observers.splice(observers.indexOf(this.callback), 1) }
  }
  const document = { readyState, documentElement: {} }
  const page = new Function('document', 'MutationObserver', `return ${pageOpsExpression()}`)(
    document, FakeMutationObserver,
  ) as PageOps
  return { page, mutate: () => { for (const fire of [...observers]) fire() }, document }
}

describe('prototype_automation wait_stable', () => {
  it('settles once the DOM has been quiet for quietMs', async () => {
    const { page } = await pageOps()
    const result = await page.ops.wait_stable({ quietMs: 150, timeoutMs: 2000 })
    expect(result.stable).toBe(true)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(150)
    expect(result.elapsedMs).toBeLessThan(1000)
  })

  it('answers stable:false at the deadline, without failing, while the page keeps changing', async () => {
    const { page, mutate } = await pageOps()
    const churn = setInterval(mutate, 30)
    try {
      const result = await page.ops.wait_stable({ quietMs: 200, timeoutMs: 400 })
      expect(result.stable).toBe(false)
      expect(result.elapsedMs).toBeGreaterThanOrEqual(400)
    } finally {
      clearInterval(churn)
    }
  })

  it('does not settle before the page finished loading', async () => {
    const { page } = await pageOps('loading')
    const result = await page.ops.wait_stable({ quietMs: 50, timeoutMs: 300 })
    expect(result.stable).toBe(false)
  })

  it('is an op every layer accepts: the tool, the library queue, and both shim copies', async () => {
    const read = (path: string) => readFile(new URL(path, REPO), 'utf8')
    expect(await read('plugins/dsh-prototype/lib/index.js')).toMatch(/INTERACTIVE_OPS = \[[^\]]*'wait_stable'/)
    expect(await read('plugin-manager/plugins/prototype/index.ts')).toContain('"wait_stable",')
    expect(await read('plugin-manager/plugins/prototype/shim.ts')).toContain('wait_stable: function (a) {')
    expect(await read('plugins/dsh-prototype/lib/shim.js')).toContain('"  wait_stable: function (a) {",')
  })
})
