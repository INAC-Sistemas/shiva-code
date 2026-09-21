// dsh-sidebar auto-open rules: which agent-created files open which sidebar
// tab. Pure and dependency-free (Node built-ins only) so it is testable
// without a harness; lib/index.js wires it to the tool pipeline and the API.

import { existsSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

/**
 * Compile a workspace-relative glob: `**` spans folders, `*` and `?` stay
 * inside one segment. `mds/**` matches every file under `mds/`.
 * @param glob - forward-slash pattern relative to the workspace root.
 * @returns the anchored matcher.
 */
export function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/'
      out += slash ? '(?:.*/)?' : '.*'
      i += slash ? 2 : 1
    } else if (c === '*') out += '[^/]*'
    else if (c === '?') out += '[^/]'
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`)
}

/**
 * Validate the `autoOpen` config at load; misconfiguration fails loud.
 * @param rules - `[{ tab, path, reveal? }]`.
 * @returns the compiled rules.
 */
export function compileAutoOpen(rules) {
  if (rules === undefined) return []
  if (!Array.isArray(rules)) throw new Error('dsh-sidebar: config.autoOpen must be a list')
  return rules.map((rule, index) => {
    const where = `dsh-sidebar: config.autoOpen[${index}]`
    if (typeof rule?.tab !== 'string' || rule.tab === '') throw new Error(`${where}.tab must name a tab type`)
    if (typeof rule.path !== 'string' || rule.path === '') throw new Error(`${where}.path must be a glob`)
    if (rule.path.startsWith('/') || rule.path.split('/').includes('..')) {
      throw new Error(`${where}.path must stay inside the workspace, got "${rule.path}"`)
    }
    if (rule.reveal !== undefined && typeof rule.reveal !== 'boolean') throw new Error(`${where}.reveal must be a boolean`)
    return { tab: rule.tab, path: rule.path, reveal: rule.reveal === true, match: globToRegExp(rule.path) }
  })
}

/**
 * The workspace-relative file an agent `write` targets, or undefined.
 * @param exec - the tool execution (`name`, parsed `arguments`, calling `agent`).
 * @returns `{ file, rel }` with `rel` in forward slashes.
 */
export function writeTargetOf(exec) {
  if (exec?.name !== 'write') return undefined
  const cwd = exec?.agent?.session?.header?.cwd
  const filePath = exec?.arguments?.file_path
  if (typeof cwd !== 'string' || cwd === '' || typeof filePath !== 'string' || filePath === '') return undefined
  const file = resolve(cwd, filePath)
  const rel = relative(resolve(cwd), file)
  if (rel === '' || rel.startsWith('..') || resolve(cwd, rel) !== file) return undefined
  return { file, rel: rel.split(sep).join('/') }
}

/** How many auto-open events the host keeps for clients that poll late. */
const AUTO_OPEN_BACKLOG = 20

/**
 * Turns successful creations into auto-open events. A `write` counts only when
 * its target did not exist before dispatch and the call succeeded: overwrites,
 * edits, failures and denials open nothing.
 */
export class AutoOpenBoard {
  seq = 0
  events = []
  creating = new Set()

  constructor(rules) {
    this.rules = rules
  }

  /** Note a `write` about to create a file some rule watches. */
  before(target) {
    if (target === undefined || existsSync(target.file)) return
    if (this.rules.some((rule) => rule.match.test(target.rel))) this.creating.add(target.file)
  }

  /** Publish one event per matching rule once the creation succeeded. */
  after(target, failed) {
    if (target === undefined || !this.creating.delete(target.file) || failed) return
    for (const rule of this.rules) {
      if (!rule.match.test(target.rel)) continue
      this.seq += 1
      this.events.push({ seq: this.seq, tab: rule.tab, path: target.rel, reveal: rule.reveal })
    }
    if (this.events.length > AUTO_OPEN_BACKLOG) this.events.splice(0, this.events.length - AUTO_OPEN_BACKLOG)
  }

  /** Events newer than `after`, plus the current sequence. */
  since(after) {
    return { seq: this.seq, events: this.events.filter((event) => event.seq > after) }
  }
}
