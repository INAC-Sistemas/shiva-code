// dsh-mcp host half: keeps the user's MCP server list in a local JSON file and
// mounts one dsh-mcp-client per enabled server, so saving, disabling or
// deleting a server changes the model's tools without a harness restart. The
// sidebar tab (client.js) drives it through POST /mcp/api/<method>.
//
// Stdio servers run local commands outside the sandbox, and their tools are
// registered in this context's scope — the global layer every agent reads.

import z from '@deepseek-ai/schemastery'
import { createMountManager } from './manager.js'
import {
  defaultStoreFile,
  normalizeServer,
  parseMcpServersJson,
  publicServer,
  readStore,
  restoreSecrets,
  validateList,
  writeStore,
} from './servers.js'

export const name = 'dsh-mcp'

export const inject = ['webServer', 'tools']

/** `file` overrides the server list path; empty means `$DSH_HOME/mcp/servers.json`. */
export const Config = z.object({
  file: z.string().default(''),
})

const API_PREFIX = '/mcp/api/'
const BODY_LIMIT_BYTES = 256 * 1024

function log(message) {
  console.log(`[dsh-mcp] ${message}`)
}

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > BODY_LIMIT_BYTES) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === String(req.headers.host ?? '')
  } catch {
    return false
  }
}

/**
 * Mount the saved servers and serve the management API.
 * @param ctx - plugin context with `webServer` and `tools`.
 * @param config - resolved {@link Config}.
 * @returns once the saved list has been read and its mounts started.
 */
export async function apply(ctx, config) {
  const file = config.file || defaultStoreFile()
  const mounts = createMountManager(ctx, { log })
  let servers = []
  let loadError = ''
  let writes = Promise.resolve()

  try {
    servers = await readStore(file)
    await mounts.reconcile(servers)
    log(`${servers.length} servidor(es) em ${file}`)
  } catch (error) {
    // A broken file is reported in the tab and blocks writes until fixed; it is never overwritten.
    loadError = error.message
    log(`lista não carregada: ${loadError}`)
  }

  /** Serialize read → change → write → reconcile, re-reading the file so manual edits are not lost. */
  function mutate(change) {
    const task = writes.then(async () => {
      const current = await readStore(file)
      const next = validateList(change(current))
      await writeStore(file, next)
      servers = next
      loadError = ''
      await mounts.reconcile(next)
    })
    writes = task.catch(() => {})
    return task
  }

  function listPayload() {
    return {
      ok: true,
      file,
      loadError,
      servers: servers.map(server => ({
        ...publicServer(server),
        ...(server.enabled ? mounts.status(server.name) : { state: 'disabled', error: '', toolCount: 0 }),
      })),
    }
  }

  function requireName(payload) {
    const serverName = String(payload.name ?? '').trim()
    if (!serverName) throw new Error('name obrigatório')
    return serverName
  }

  const handler = async (req, res) => {
    const method = new URL(req.url ?? '/', 'http://local').pathname.slice(API_PREFIX.length)
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' })
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'cross-origin request rejected' })
    let payload
    try {
      payload = await readBody(req)
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message })
    }
    try {
      switch (method) {
        case 'list':
          return json(res, 200, listPayload())
        case 'save': {
          const original = String(payload.original ?? '').trim()
          await mutate((current) => {
            const previous = current.find(server => server.name === (original || payload.server?.name))
            const server = normalizeServer(restoreSecrets(payload.server, previous))
            if (original && !previous) throw new Error(`servidor "${original}" não existe`)
            if (server.name !== original && current.some(existing => existing.name === server.name)) {
              throw new Error(`já existe um servidor "${server.name}"`)
            }
            const rest = current.filter(existing => existing.name !== original && existing.name !== server.name)
            return [...rest, server]
          })
          return json(res, 200, listPayload())
        }
        case 'delete': {
          const serverName = requireName(payload)
          await mutate((current) => {
            if (!current.some(server => server.name === serverName)) throw new Error(`servidor "${serverName}" não existe`)
            return current.filter(server => server.name !== serverName)
          })
          return json(res, 200, listPayload())
        }
        case 'toggle': {
          const serverName = requireName(payload)
          await mutate((current) => {
            if (!current.some(server => server.name === serverName)) throw new Error(`servidor "${serverName}" não existe`)
            return current.map(server => server.name === serverName ? { ...server, enabled: payload.enabled === true } : server)
          })
          return json(res, 200, listPayload())
        }
        case 'reconnect': {
          const serverName = requireName(payload)
          await mounts.reconcile(servers, [serverName])
          return json(res, 200, listPayload())
        }
        case 'import': {
          const imported = parseMcpServersJson(String(payload.text ?? ''))
          await mutate((current) => {
            const clash = imported.find(server => current.some(existing => existing.name === server.name))
            if (clash) throw new Error(`já existe um servidor "${clash.name}"`)
            return [...current, ...imported]
          })
          return json(res, 200, listPayload())
        }
        default:
          return json(res, 404, { ok: false, error: `unknown method "${method}"` })
      }
    } catch (error) {
      return json(res, 400, { ok: false, error: error?.message ?? String(error) })
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/mcp/api', handler }), 'dsh-mcp: api')
}
