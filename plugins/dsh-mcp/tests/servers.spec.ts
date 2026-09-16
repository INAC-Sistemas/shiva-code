import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  SECRET_MASK,
  STORE_VERSION,
  defaultStoreFile,
  normalizeServer,
  parseMcpServersJson,
  publicServer,
  readStore,
  restoreSecrets,
  writeStore,
} from '../lib/servers.js'

const stdio = { name: 'files', transport: 'stdio', command: 'npx', args: ['-y', 'server'], env: { API_KEY: 'secret' } }
const http = { name: 'remote', transport: 'streamable-http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer t' } }

describe('server list file', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-mcp-'))
    file = join(dir, 'mcp', 'servers.json')
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('defaults under DSH_HOME', () => {
    expect(defaultStoreFile({ DSH_HOME: '/data/harness' })).toBe(join('/data/harness', 'mcp', 'servers.json'))
  })

  it('reads an absent file as an empty list', async () => {
    await expect(readStore(file)).resolves.toEqual([])
  })

  it('round-trips normalized servers with owner-only permissions', async () => {
    const servers = [normalizeServer(stdio), normalizeServer(http)]
    await writeStore(file, servers)
    await expect(readStore(file)).resolves.toEqual(servers)
    expect(JSON.parse(await readFile(file, 'utf8')).version).toBe(STORE_VERSION)
    if (process.platform !== 'win32') expect((await stat(file)).mode & 0o777).toBe(0o600)
  })

  it('refuses an unknown version and invalid JSON', async () => {
    await writeStore(file, [])
    await writeFile(file, JSON.stringify({ version: 99, servers: [] }))
    await expect(readStore(file)).rejects.toThrow(/formato desconhecido/)
    await writeFile(file, '{')
    await expect(readStore(file)).rejects.toThrow(/não é JSON válido/)
  })

  it('refuses duplicate names in the file', async () => {
    await writeStore(file, [normalizeServer(stdio)])
    await writeFile(file, JSON.stringify({ version: STORE_VERSION, servers: [stdio, stdio] }))
    await expect(readStore(file)).rejects.toThrow(/nome duplicado/)
  })
})

describe('server validation', () => {
  it('fills defaults', () => {
    expect(normalizeServer({ name: 'x', transport: 'stdio', command: 'node' })).toEqual({
      name: 'x', enabled: true, toolCallTimeoutMs: 60_000, transport: 'stdio', command: 'node', args: [], env: {}, cwd: '',
    })
  })

  it.each([
    [{ ...stdio, name: 'has space' }, /inválido/],
    [{ ...stdio, name: 'openviking' }, /reservado/],
    [{ ...stdio, command: ' ' }, /comando obrigatório/],
    [{ ...stdio, env: { 'BAD-KEY': 'v' } }, /chave "BAD-KEY"/],
    [{ ...stdio, args: [1] }, /lista de textos/],
    [{ ...http, url: 'ftp://example.com' }, /http\(s\)/],
    [{ ...http, url: 'nope' }, /URL inválida/],
    [{ ...stdio, transport: 'sse' }, /transporte/],
    [{ ...stdio, toolCallTimeoutMs: 10 }, /timeout/],
  ])('rejects %j', (input, message) => {
    expect(() => normalizeServer(input)).toThrow(message)
  })
})

describe('secrets', () => {
  it('masks env and header values for the browser', () => {
    expect(publicServer(normalizeServer(stdio)).env).toEqual({ API_KEY: SECRET_MASK })
    expect(publicServer(normalizeServer(http)).headers).toEqual({ Authorization: SECRET_MASK })
  })

  it('restores masked values from the stored entry and keeps new ones', () => {
    const previous = normalizeServer(stdio)
    const input = { ...stdio, env: { API_KEY: SECRET_MASK, OTHER: 'new', MISSING: SECRET_MASK } }
    expect(restoreSecrets(input, previous).env).toEqual({ API_KEY: 'secret', OTHER: 'new', MISSING: '' })
  })
})

describe('mcpServers import', () => {
  it('converts stdio and http entries', () => {
    const servers = parseMcpServersJson(JSON.stringify({
      mcpServers: {
        files: { command: 'npx', args: ['-y', 'server'], env: { API_KEY: 'k' } },
        remote: { type: 'http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer t' } },
        implicit: { url: 'https://example.com/other' },
      },
    }))
    expect(servers.map(server => [server.name, server.transport])).toEqual([
      ['files', 'stdio'], ['remote', 'streamable-http'], ['implicit', 'streamable-http'],
    ])
  })

  it('rejects SSE and documents without mcpServers', () => {
    expect(() => parseMcpServersJson(JSON.stringify({ mcpServers: { old: { type: 'sse', url: 'https://x' } } }))).toThrow(/SSE/)
    expect(() => parseMcpServersJson('{}')).toThrow(/mcpServers/)
    expect(() => parseMcpServersJson('nope')).toThrow(/JSON inválido/)
  })
})
