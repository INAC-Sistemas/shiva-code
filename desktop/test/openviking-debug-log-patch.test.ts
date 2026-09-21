import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

type DebugLog = (level: string, source: string, message: string, detail?: unknown) => void
type OpenVikingModule = {
  createDebugLog: (file: string, maxBytes: number) => DebugLog
  redact: (value: unknown) => unknown
}

/** The patched host half as installed; a computed specifier because the package ships no types. */
const PLUGIN_ENTRY = new URL('../node_modules/dsh-openviking/lib/index.js', import.meta.url).href

const loadPlugin = async (): Promise<OpenVikingModule> =>
  (await import(/* @vite-ignore */ PLUGIN_ENTRY)) as OpenVikingModule

describe('dsh-openviking debug log patch', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ov-log-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('appends timestamped lines, creating the log directory', async () => {
    const { createDebugLog } = await loadPlugin()
    const file = join(dir, 'logs', 'openviking.log')
    const write = createDebugLog(file, 1024 * 1024)
    write('info', 'host', 'plugin ativando')
    write('error', 'probe', 'iframe sem resposta', { frameSrc: 'http://127.0.0.1:1933/studio' })

    const lines = (await readFile(file, 'utf8')).trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\S+Z INFO  \[host\] plugin ativando$/)
    expect(lines[1]).toContain('ERROR [probe] iframe sem resposta {"frameSrc":"http://127.0.0.1:1933/studio"}')
  })

  it('masks secret-named fields at any depth', async () => {
    const { createDebugLog } = await loadPlugin()
    const file = join(dir, 'openviking.log')
    createDebugLog(file, 1024 * 1024)('info', 'api', 'configure recebido', {
      embedding: { provider: 'openrouter', api_key: 'sk-or-secret', model: 'm' },
      headers: { Authorization: 'Bearer sk-secret' },
    })

    const text = await readFile(file, 'utf8')
    expect(text).not.toContain('sk-or-secret')
    expect(text).not.toContain('sk-secret')
    expect(text).toContain('"api_key":"***"')
    expect(text).toContain('"model":"m"')
  })

  it('rotates to a single previous generation past the size limit', async () => {
    const { createDebugLog } = await loadPlugin()
    const file = join(dir, 'openviking.log')
    const write = createDebugLog(file, 200)
    for (let i = 0; i < 10; i++) write('info', 'server', `linha ${i} ${'x'.repeat(40)}`)

    expect((await stat(file)).size).toBeLessThanOrEqual(200)
    expect((await stat(`${file}.1`)).size).toBeGreaterThan(0)
    expect(await readFile(file, 'utf8')).toContain('linha 9')
  })

  it('never throws when the log path cannot be written', async () => {
    const { createDebugLog } = await loadPlugin()
    const blocker = join(dir, 'blocker')
    createDebugLog(blocker, 1024)('info', 'host', 'cria um arquivo')
    // A file where the log directory should be makes every write fail.
    expect(() => createDebugLog(join(blocker, 'logs', 'openviking.log'), 1024)('info', 'host', 'x')).not.toThrow()
  })

  it('wires the Memory tab to the log in the dependency patch', async () => {
    const patch = await readFile(patchPath('dsh-openviking'), 'utf8')
    expect(patch).toContain("+        case 'client-log': {")
    expect(patch).toContain("+        case 'log-info': {")
    expect(patch).toContain('+class MemoryErrorBoundary extends React.Component {')
    expect(patch).toContain('+async function probeFrameUrl(src) {')
  })
})
