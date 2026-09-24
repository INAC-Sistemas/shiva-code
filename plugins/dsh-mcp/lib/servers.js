// dsh-mcp server list: the on-disk file, entry validation, secret masking for
// the browser, and the `mcpServers` JSON import. No Cordis context here — the
// live mounts belong to manager.js.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import * as mcpClient from '@deepseek-ai/dsh-mcp-client'

/** Format version of `servers.json`; any other value is refused, never rewritten. */
export const STORE_VERSION = 1

/** Placeholder the API sends instead of a stored env/header value. Saving it back keeps the stored value. */
export const SECRET_MASK = '••••••••'

/** Server names other plugins already mount through dsh-mcp-client. */
export const RESERVED_NAMES = new Set(['openviking'])

const NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const HEADER_KEY_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * Default location of the server list: `$DSH_HOME/mcp/servers.json`, or
 * `~/.dsh/mcp/servers.json` when `DSH_HOME` is unset.
 * @param env - the environment to read `DSH_HOME` from.
 * @returns the absolute file path.
 */
export function defaultStoreFile(env = process.env) {
  return join(env.DSH_HOME || join(homedir(), '.dsh'), 'mcp', 'servers.json')
}

/**
 * Read and validate the server list.
 * @param file - path of `servers.json`.
 * @returns the validated servers; an absent file is an empty list.
 * @throws when the file is not JSON, has another `version`, or holds an invalid entry.
 */
export async function readStore(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    // ENOENT is the first-run state; every other read error must surface.
    if (error?.code === 'ENOENT') return []
    throw error
  }
  let doc
  try {
    doc = JSON.parse(text)
  } catch (error) {
    throw new Error(`${file} não é JSON válido: ${error.message}`)
  }
  if (doc?.version !== STORE_VERSION || !Array.isArray(doc.servers)) {
    throw new Error(`${file} tem formato desconhecido (esperado version ${STORE_VERSION} com servers[])`)
  }
  return validateList(doc.servers.map(normalizeServer))
}

/**
 * Write the server list atomically (temp file + rename), owner-only.
 * @param file - path of `servers.json`.
 * @param servers - validated servers.
 * @returns once the new file is in place.
 */
export async function writeStore(file, servers) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  const temp = `${file}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify({ version: STORE_VERSION, servers }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temp, file)
}

/**
 * Validate one entry from the file or the API and project it onto the stored fields.
 * @param input - untrusted entry.
 * @returns the normalized server.
 * @throws with a user-facing message when the entry is invalid.
 */
export function normalizeServer(input) {
  if (!input || typeof input !== 'object') throw new Error('servidor MCP inválido')
  const name = String(input.name ?? '').trim()
  if (!NAME_PATTERN.test(name)) throw new Error(`nome "${name}" inválido: use 1-32 letras, números, "_" ou "-"`)
  if (RESERVED_NAMES.has(name)) throw new Error(`o nome "${name}" é reservado por outro plugin`)
  const timeout = Number(input.toolCallTimeoutMs ?? 60_000)
  if (!Number.isInteger(timeout) || timeout < 1000) throw new Error(`${name}: timeout deve ser um inteiro ≥ 1000 ms`)
  const base = { name, enabled: input.enabled !== false, toolCallTimeoutMs: timeout }

  let server
  switch (input.transport) {
    case 'stdio': {
      const command = String(input.command ?? '').trim()
      if (!command) throw new Error(`${name}: comando obrigatório`)
      server = {
        ...base,
        transport: 'stdio',
        command,
        args: stringArray(input.args, `${name}: args`),
        env: stringRecord(input.env, ENV_KEY_PATTERN, `${name}: env`),
        cwd: String(input.cwd ?? '').trim(),
      }
      break
    }
    case 'streamable-http': {
      const url = String(input.url ?? '').trim()
      let parsed
      try {
        parsed = new URL(url)
      } catch {
        throw new Error(`${name}: URL inválida`)
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error(`${name}: a URL deve ser http(s)`)
      server = {
        ...base,
        transport: 'streamable-http',
        url,
        headers: stringRecord(input.headers, HEADER_KEY_PATTERN, `${name}: headers`),
      }
      break
    }
    default:
      throw new Error(`${name}: transporte deve ser "stdio" ou "streamable-http"`)
  }
  // The mcp-client schema is the authority on what the mount accepts.
  mcpClient.Config(clientConfig(server))
  return server
}

/**
 * Reject duplicate names.
 * @param servers - normalized servers.
 * @returns the same list.
 * @throws when two entries share a name.
 */
export function validateList(servers) {
  const seen = new Set()
  for (const server of servers) {
    if (seen.has(server.name)) throw new Error(`nome duplicado: "${server.name}"`)
    seen.add(server.name)
  }
  return servers
}

/**
 * The dsh-mcp-client config for one stored server.
 * @param server - normalized server.
 * @returns config whose startup failure rejects the mount, so the tab can show the error.
 */
export function clientConfig(server) {
  const common = { serverName: server.name, toolCallTimeoutMs: server.toolCallTimeoutMs, failOnStartupError: true }
  return server.transport === 'stdio'
    ? { ...common, transport: 'stdio', command: server.command, args: server.args, env: server.env, cwd: server.cwd }
    : { ...common, transport: 'streamable-http', url: server.url, headers: server.headers }
}

/**
 * The browser-facing copy of a server: env and header values replaced by {@link SECRET_MASK}.
 * @param server - normalized server.
 * @returns a copy safe to send to the client.
 */
export function publicServer(server) {
  return server.transport === 'stdio'
    ? { ...server, env: maskValues(server.env) }
    : { ...server, headers: maskValues(server.headers) }
}

/**
 * Restore stored values where the client sent {@link SECRET_MASK} back.
 * @param input - untrusted entry from the API.
 * @param previous - the stored server being edited, if any.
 * @returns the entry with masked values replaced; a mask without a stored value becomes empty.
 */
export function restoreSecrets(input, previous) {
  const restore = (record, stored) => Object.fromEntries(Object.entries(record ?? {}).map(([key, value]) =>
    [key, value === SECRET_MASK ? (stored?.[key] ?? '') : value]))
  return {
    ...input,
    env: restore(input?.env, previous?.env),
    headers: restore(input?.headers, previous?.headers),
  }
}

/**
 * Parse the `{"mcpServers": {...}}` document used by Claude Desktop, Cursor and Claude Code.
 * @param text - the pasted JSON.
 * @returns normalized servers, enabled.
 * @throws when the JSON is invalid, has no `mcpServers`, or an entry is invalid or uses SSE.
 */
export function parseMcpServersJson(text) {
  let doc
  try {
    doc = JSON.parse(text)
  } catch (error) {
    throw new Error(`JSON inválido: ${error.message}`)
  }
  const map = doc?.mcpServers
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('o JSON precisa ter um objeto "mcpServers"')
  return validateList(Object.entries(map).map(([name, entry]) => {
    const type = entry?.type ?? (entry?.url ? 'http' : 'stdio')
    if (type === 'sse') throw new Error(`${name}: transporte SSE não é suportado; use Streamable HTTP`)
    const transport = type === 'stdio' ? 'stdio' : 'streamable-http'
    return normalizeServer({ ...entry, name, transport })
  }))
}

function maskValues(record) {
  return Object.fromEntries(Object.keys(record).map(key => [key, SECRET_MASK]))
}

function stringArray(value, label) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} deve ser uma lista de textos`)
  return value
}

function stringRecord(value, keyPattern, label) {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} deve ser um objeto chave/valor`)
  for (const [key, item] of Object.entries(value)) {
    if (!keyPattern.test(key)) throw new Error(`${label}: chave "${key}" inválida`)
    if (typeof item !== 'string') throw new Error(`${label}: o valor de "${key}" deve ser texto`)
  }
  return { ...value }
}
