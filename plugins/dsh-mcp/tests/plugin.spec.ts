import { Readable } from 'node:stream'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as dshMcp from '../lib/index.js'

const fixtureServer = fileURLToPath(new URL('../../../packages/mcp/mcp-client/tests/fixture-server.ts', import.meta.url))
const FIXTURE_TOOL_COUNT = 6

type Handler = (req: unknown, res: unknown) => Promise<void>
interface ApiResult {
  status: number
  body: {
    ok: boolean
    error?: string
    loadError?: string
    servers?: Array<{ name: string, enabled: boolean, state: string, error: string, toolCount: number, env?: Record<string, string> }>
  }
}

function fixture(overrides: Record<string, unknown> = {}) {
  return { name: 'fixture', transport: 'stdio', command: process.execPath, args: [fixtureServer], env: { TOKEN: 'abc' }, ...overrides }
}

describe('dsh-mcp plugin', () => {
  let dir: string
  let file: string
  let ctx: Context
  let handler: Handler

  async function boot(): Promise<void> {
    ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.provide('webServer', { register: (route: { handler: Handler }) => { handler = route.handler; return () => {} } })
    await ctx.plugin(dshMcp, { file })
  }

  function call(method: string, payload: unknown = {}, init: { method?: string, origin?: string } = {}): Promise<ApiResult> {
    const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(payload))]), {
      url: `/mcp/api/${method}`,
      method: init.method ?? 'POST',
      headers: { host: 'localhost:1', ...(init.origin ? { origin: init.origin } : {}) },
    })
    return new Promise((resolve) => {
      let status = 0
      const res = {
        writeHead: (code: number) => { status = code },
        end: (text: string) => resolve({ status, body: JSON.parse(text) }),
      }
      void handler(req, res)
    })
  }

  async function settledServer(name: string) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const { body } = await call('list')
      const server = body.servers?.find(entry => entry.name === name)
      if (server && server.state !== 'connecting') return server
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error(`${name} never settled`)
  }

  const toolNames = () => ctx.tools.schemas().map(schema => schema.name).filter(name => name.startsWith('mcp__'))

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-mcp-plugin-'))
    file = join(dir, 'servers.json')
  })
  afterEach(async () => {
    await ctx?.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })

  it('mounts a saved server live and masks its secrets', async () => {
    await boot()
    const saved = await call('save', { server: fixture() })
    expect(saved.body.ok).toBe(true)
    expect(saved.body.servers?.[0]?.env).toEqual({ TOKEN: '••••••••' })

    const server = await settledServer('fixture')
    expect(server).toMatchObject({ state: 'connected', toolCount: FIXTURE_TOOL_COUNT })
    expect(toolNames()).toContain('mcp__fixture__add')
    expect(JSON.parse(await readFile(file, 'utf8')).servers[0].env).toEqual({ TOKEN: 'abc' })
  })

  it('remounts an edited server under the same name and keeps masked secrets', async () => {
    await boot()
    await call('save', { server: fixture() })
    await settledServer('fixture')

    const edited = await call('save', { original: 'fixture', server: fixture({ env: { TOKEN: '••••••••' }, toolCallTimeoutMs: 5000 }) })
    expect(edited.body.ok).toBe(true)
    expect(await settledServer('fixture')).toMatchObject({ state: 'connected', error: '' })
    const stored = JSON.parse(await readFile(file, 'utf8')).servers[0]
    expect(stored).toMatchObject({ toolCallTimeoutMs: 5000, env: { TOKEN: 'abc' } })
  })

  it('removes tools when a server is disabled or deleted', async () => {
    await boot()
    await call('save', { server: fixture() })
    await settledServer('fixture')

    await call('toggle', { name: 'fixture', enabled: false })
    expect(toolNames()).toEqual([])
    expect((await call('list')).body.servers?.[0]?.state).toBe('disabled')

    await call('toggle', { name: 'fixture', enabled: true })
    expect(await settledServer('fixture')).toMatchObject({ state: 'connected' })

    const deleted = await call('delete', { name: 'fixture' })
    expect(deleted.body.servers).toEqual([])
    expect(toolNames()).toEqual([])
  })

  it('reports a failing server and retries it on reconnect', async () => {
    await boot()
    await call('save', { server: fixture({ name: 'broken', args: [join(dir, 'missing.mjs')] }) })
    const failed = await settledServer('broken')
    expect(failed.state).toBe('error')
    expect(failed.error).not.toBe('')

    await writeFile(join(dir, 'missing.mjs'), `await import(${JSON.stringify(fixtureServer)})\n`)
    await call('reconnect', { name: 'broken' })
    expect(await settledServer('broken')).toMatchObject({ state: 'connected', toolCount: FIXTURE_TOOL_COUNT })
  })

  it('mounts the saved list on the next boot', async () => {
    await boot()
    await call('save', { server: fixture() })
    await settledServer('fixture')
    await ctx.fiber.dispose()

    await boot()
    expect(await settledServer('fixture')).toMatchObject({ state: 'connected' })
  })

  it('rejects duplicates, renames onto an existing name, and unknown servers', async () => {
    await boot()
    await call('save', { server: fixture({ name: 'one', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp', enabled: false }) })
    await call('save', { server: fixture({ name: 'two', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp', enabled: false }) })

    expect((await call('save', { server: fixture({ name: 'one', enabled: false }) })).body.error).toMatch(/já existe/)
    expect((await call('save', { original: 'two', server: fixture({ name: 'one', enabled: false }) })).body.error).toMatch(/já existe/)
    expect((await call('delete', { name: 'ghost' })).body.error).toMatch(/não existe/)
    expect((await call('list')).body.servers?.map(server => server.name)).toEqual(['one', 'two'])
  })

  it('refuses writes over an unreadable file without touching it', async () => {
    await writeFile(file, '{ broken')
    await boot()
    const listed = await call('list')
    expect(listed.body.loadError).toMatch(/não é JSON válido/)
    expect((await call('save', { server: fixture() })).body.ok).toBe(false)
    expect(await readFile(file, 'utf8')).toBe('{ broken')
  })

  it('accepts only same-origin POST', async () => {
    await boot()
    expect((await call('list', {}, { method: 'GET' })).status).toBe(405)
    expect((await call('list', {}, { origin: 'http://evil.example' })).status).toBe(403)
  })
})
