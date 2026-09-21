import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

type Probe = {
  alive(pid: number): boolean
  cmdline(pid: number): string | undefined
  kill(pid: number, signal: string): void
  sleep(ms: number): Promise<void>
}
type OpenVikingModule = {
  isOpenVikingProcess: (pid: number, deps: Probe) => boolean
  releaseStaleLock: (lockFile: string, ownPid: number | undefined, deps: Probe) => Promise<{ pid: number | null, killed: boolean }>
  settingsForForm: (s: unknown) => { embedding: Record<string, unknown> | null, vlm: Record<string, unknown> | null }
}

/** The patched host half as installed; a computed specifier because the package ships no types. */
const PLUGIN_ENTRY = new URL('../node_modules/dsh-openviking/lib/index.js', import.meta.url).href

const loadPlugin = async (): Promise<OpenVikingModule> =>
  (await import(/* @vite-ignore */ PLUGIN_ENTRY)) as OpenVikingModule

/** A process table the test controls: which pids live, what they run, and what a signal does. */
function fakeProcesses(table: Record<number, { cmdline: string, diesOn?: string }>) {
  const live = new Set(Object.keys(table).map(Number))
  const signals: Array<[number, string]> = []
  const probe: Probe = {
    alive: (pid) => live.has(pid),
    cmdline: (pid) => table[pid]?.cmdline,
    kill: (pid, signal) => {
      signals.push([pid, signal])
      if (table[pid]?.diesOn === signal || signal === 'SIGKILL') live.delete(pid)
    },
    sleep: async () => {},
  }
  return { probe, signals }
}

describe('dsh-openviking reconfigure patch', () => {
  let dir: string
  let lock: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ov-lock-'))
    lock = join(dir, '.openviking.pid')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('stops an orphan OpenViking server holding the data directory', async () => {
    const { releaseStaleLock } = await loadPlugin()
    await writeFile(lock, '618042\n')
    const { probe, signals } = fakeProcesses({ 618042: { cmdline: '/venv/bin/openviking-server', diesOn: 'SIGTERM' } })

    expect(await releaseStaleLock(lock, undefined, probe)).toEqual({ pid: 618042, killed: true })
    expect(signals).toEqual([[618042, 'SIGTERM']])
  })

  it('escalates to SIGKILL when SIGTERM is ignored', async () => {
    const { releaseStaleLock } = await loadPlugin()
    await writeFile(lock, '700')
    const { probe, signals } = fakeProcesses({ 700: { cmdline: 'python openviking-server' } })

    expect(await releaseStaleLock(lock, undefined, probe)).toEqual({ pid: 700, killed: true })
    expect(signals).toEqual([[700, 'SIGTERM'], [700, 'SIGKILL']])
  })

  it('never signals a process it cannot verify as OpenViking (a recycled pid)', async () => {
    const { releaseStaleLock } = await loadPlugin()
    await writeFile(lock, '800')
    const { probe, signals } = fakeProcesses({ 800: { cmdline: '/usr/bin/firefox' } })

    expect(await releaseStaleLock(lock, undefined, probe)).toEqual({ pid: 800, killed: false })
    expect(signals).toEqual([])
  })

  it('leaves its own server and a missing or dead lock alone', async () => {
    const { releaseStaleLock } = await loadPlugin()
    const { probe, signals } = fakeProcesses({ 900: { cmdline: 'openviking-server' } })
    expect(await releaseStaleLock(lock, undefined, probe)).toEqual({ pid: null, killed: false })
    await writeFile(lock, '900')
    expect(await releaseStaleLock(lock, 900, probe)).toEqual({ pid: null, killed: false })
    await writeFile(lock, '901')
    expect(await releaseStaleLock(lock, undefined, probe)).toEqual({ pid: null, killed: false })
    expect(signals).toEqual([])
  })

  it('hands the form the saved settings without any key', async () => {
    const { settingsForForm } = await loadPlugin()
    const form = settingsForForm({
      embedding: { provider: 'openai', api_base: 'https://api', api_key: 'sk-secret', model: 'm', dimension: '1536' },
      vlm: null,
    })
    expect(form.embedding).toEqual({ provider: 'openai', api_base: 'https://api', api_key: '', hasKey: true, model: 'm', dimension: '1536' })
    expect(form.vlm).toBeNull()
    expect(JSON.stringify(form)).not.toContain('sk-secret')
  })

  it('frames the Studio of the server this installation runs, not a fixed port', async () => {
    const client = await readFile(new URL('../node_modules/dsh-openviking/lib/client.js', import.meta.url), 'utf8')
    expect(client).not.toMatch(/127\.0\.0\.1:1933/)
    expect(client).toContain('`${st.baseUrl}/studio`')
  })

  it('sends and writes a VLM block only when a model is chosen', async () => {
    const client = await readFile(new URL('../node_modules/dsh-openviking/lib/client.js', import.meta.url), 'utf8')
    const host = await readFile(new URL('../node_modules/dsh-openviking/lib/index.js', import.meta.url), 'utf8')
    expect(client).toContain('vlm: form.vlm?.api_base && form.vlm?.model ? form.vlm : null')
    expect(host).toContain('if (s.vlm?.api_base && s.vlm?.model) {')
  })

  it('re-imports the OpenRouter key from dsh on every save instead of keeping the stored one', async () => {
    const host = await readFile(new URL('../node_modules/dsh-openviking/lib/index.js', import.meta.url), 'utf8')
    expect(host).toContain("next.provider !== 'openrouter' && !next.api_key && prev?.[block]?.api_key")
  })
})
