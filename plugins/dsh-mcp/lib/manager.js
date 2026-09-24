// dsh-mcp live mounts: one dsh-mcp-client fork per enabled server, reconciled
// against the saved list without restarting the harness.

import * as mcpClient from '@deepseek-ai/dsh-mcp-client'
import { clientConfig } from './servers.js'

/**
 * Create the mount manager for one plugin context.
 *
 * Every mount is a fork of `ctx`, so plugin teardown disposes all of them.
 * Reconciliation runs serially: a changed or removed server is disposed
 * (releasing its `serverName` reservation and unregistering its tools) before
 * the replacement is mounted.
 * @param ctx - the dsh-mcp plugin context; mounts register tools in its scope.
 * @param options - `plugin` overrides the mounted plugin (tests); `log` receives one line per transition.
 * @returns `reconcile(servers, force?)`, `status(name)` and `settled()`.
 */
export function createMountManager(ctx, { plugin = mcpClient, log = () => {} } = {}) {
  /** @type {Map<string, { fiber: any, fingerprint: string, state: 'connecting' | 'connected' | 'error', error: string, ready: Promise<void> }>} */
  const mounts = new Map()
  let queue = Promise.resolve()

  async function run(servers, force) {
    const wanted = new Map(servers.filter(server => server.enabled).map(server => [server.name, clientConfig(server)]))
    for (const [name, mount] of [...mounts]) {
      const config = wanted.get(name)
      // A failed mount is retried by any reconciliation, not only by an explicit reconnect.
      if (config && JSON.stringify(config) === mount.fingerprint && mount.state !== 'error' && !force.has(name)) continue
      mounts.delete(name)
      await mount.fiber.dispose()
      log(`${name}: desmontado`)
    }
    for (const [name, config] of wanted) {
      if (mounts.has(name)) continue
      const mount = { fiber: undefined, fingerprint: JSON.stringify(config), state: 'connecting', error: '', ready: undefined }
      mount.fiber = ctx.plugin(plugin, config)
      mount.ready = Promise.resolve(mount.fiber).then(
        () => {
          mount.state = 'connected'
          log(`${name}: conectado`)
        },
        (error) => {
          mount.state = 'error'
          mount.error = error?.cause?.message ?? error?.message ?? String(error)
          log(`${name}: falhou — ${mount.error}`)
        },
      )
      mounts.set(name, mount)
    }
  }

  return {
    /**
     * Queue a reconciliation against `servers`.
     * @param servers - the full saved list.
     * @param force - names to remount even when unchanged.
     * @returns once this reconciliation has disposed and started its mounts (not waited for their connection).
     */
    reconcile(servers, force = []) {
      const task = queue.then(() => run(servers, new Set(force)))
      // A failed reconciliation (e.g. the context is already disposing) must
      // not poison later ones; the caller still sees this one's rejection.
      queue = task.catch((error) => log(`reconciliação falhou: ${error?.message ?? error}`))
      return task
    },
    /**
     * Live state of one server.
     * @param name - server name.
     * @returns the mount state, or `stopped` when nothing is mounted, plus the error text and tool count.
     */
    status(name) {
      const mount = mounts.get(name)
      if (!mount) return { state: 'stopped', error: '', toolCount: 0 }
      const prefix = `mcp__${name}__`
      const toolCount = ctx.tools.schemas().filter(schema => schema.name.startsWith(prefix)).length
      return { state: mount.state, error: mount.error, toolCount }
    },
    /**
     * Wait for queued reconciliations and every mount's first connection to settle.
     * @returns once no mount is still connecting.
     */
    async settled() {
      await queue
      await Promise.all([...mounts.values()].map(mount => mount.ready))
    },
  }
}
