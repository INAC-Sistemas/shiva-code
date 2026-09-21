// dsh-tool-guard host half: enforces process laws at the tool seam instead of
// trusting prose. A guard is evaluated after every `tools/pre-execute` listener
// and is monotonic — once it returns a reason the call is denied and no later
// listener can turn it back into permission. The laws:
//
//   1. the principal agent (depth 0) writes process artifacts (`mds/`, the
//      `prototype/` folder), product code in `src/`/`public/` only as a
//      fast-fix window, and the config/tooling surface (`.scripts/` and
//      root-level config files). `testes/` stays qa-only and git commit/push
//      stays with the human;
//   2. role policies for role-bound subagents: `builder` (fast code) may write
//      only src/ and public/ and run build/typecheck — the testing is the
//      principal's job; `qa` (post-human regression) may write only testes/ and
//      run suites. Neither may spawn subagents; neither may git commit/push;
//   3. mechanical hooks on every write/edit: encoding integrity (no U+FFFD may
//      be introduced), the frozen prototype contract, UX-* traceability, and
//      the single Kanban transition rule (`active` only becomes `in_progress`);
//   4. every agent is denied `git commit`/`git push` — including the principal;
//   5. a subagent briefing over ~50 KB is rejected — point at the artifact,
//      do not paste it;
//   6. `status: done` is denied to every agent: Done is the human's move at the
//      end of the flow.
//
// Role binding: the `subagent` tool accepts `role: "builder" | "qa"`; the tool
// forwards it as the child's `guardRole` agent option, which this guard reads
// synchronously. No role → inherited behavior, unchanged.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve } from 'node:path'

export const inject = ['tools']

/** Tools whose arguments carry a destination path and file text. */
const GUARDED_FS = new Set(['write', 'edit'])

/** Tools that run shell commands (name → argument key holding the command). */
const SHELL_TOOLS = new Map([
  ['bash', 'command'],
  ['pwsh', 'command'],
  ['terminal_send', 'text'],
])

/** Git actions no subagent may run. */
const GIT_DENY_RE = /\bgit\s+(commit|push)\b/i

/** Postgres surface no builder may touch (databases are the deploy path's job). */
const PG_DENY_RE = /\b(psql|createdb|dropdb|pg_dump|pg_restore|pg_ctl)\b/i

/** External-network commands a fast builder has no business running. */
const NET_DENY_RE = /\b(curl|wget|ssh|scp|sftp|ftp|telnet|nc|npm\s+(install|i|publish)|pnpm\s+(add|install|publish)|yarn\s+(add|install|publish)|pip3?\s+install)\b/i

/**
 * The principal agent's write surface, declarative and grouped by reason:
 *
 *  - PROCESS ARTIFACTS (`mds/`, `prototype/`) — the epic's own files. The
 *    principal owns the process, so it owns these.
 *  - PRODUCT CODE (`src/`, `public/`) — written by the builder role; the
 *    principal may only fast-fix what the live browser proof exposed
 *    (edit → re-test immediately). Not widened here.
 *  - PROJECT SCAFFOLD (`PROJECT_SCAFFOLD_FILES`, `TEST_RUNNER_FILES`) — the
 *    root files a web app needs outside src/: index.html and the bundler,
 *    style, lint, component-registry and test-runner configs.
 *  - CONFIG & TOOLING (`DEFAULT_ALLOWED_TOOLING_ROOTS` + root config files) —
 *    build/tooling scripts and root-level configuration. These are NOT product
 *    code: a defect in a packaging script or a tsconfig path has no
 *    builder-shaped owner, and blocking it left real build defects unfixable by
 *    any agent (a human had to hand-edit).
 *
 * `testes/` is deliberately absent: tests are qa-only. Paths outside the
 * workspace are refused by the resolution itself.
 */
const DEFAULT_ALLOWED_ROOTS = ['mds', 'prototype']

/** Fast-fix mode: the principal may edit product code directly (fix found in the browser → edit → re-test). */
const PRINCIPAL_CODE_ROOTS = ['src', 'public']

/** Tooling folders the principal may edit: build/packaging scripts, not product code. */
const DEFAULT_ALLOWED_TOOLING_ROOTS = ['.scripts']

/**
 * Root-level configuration files the principal may edit (globs; a path with a
 * separator never matches — only files directly at the workspace root). These
 * are deployment/tooling configuration, not product code.
 */
const PRINCIPAL_CONFIG_FILES = [
  'tsconfig.json', 'tsconfig.*.json', // TypeScript project configs
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', // package manifests
  '.gitignore', '.gitattributes', '.railwayignore', // VCS / deploy ignore rules
  'railway.toml', 'railway.json', // deploy configuration
  '.npmrc', '.editorconfig', // tool configuration
]

/**
 * Root-level files a web project cannot live without, outside src/ and public/:
 * the Vite entry page and the build, style, lint and component-registry
 * configs the pipeline's skills require (`/shadcn-ui` writes components.json,
 * `/tailwind-patterns` the Tailwind config). Without them no agent could
 * scaffold the app — the builder was confined to src/ and public/, and the
 * principal's config list held only manifests and deploy files.
 */
const PROJECT_SCAFFOLD_FILES = [
  'index.html', // Vite's entry page, which must sit at the project root
  'vite.config.*', 'next.config.*', // bundler / framework config
  'tailwind.config.*', 'postcss.config.*', // styling pipeline
  'eslint.config.*', // lint config
  'components.json', // shadcn/ui component registry
]

/** Test-runner configs: qa owns the tests, so it owns how they run. */
const TEST_RUNNER_FILES = ['vitest.config.*', 'playwright.config.*']

/** Role-scoped write allowlists, relative to the workspace. */
const BUILDER_ALLOW_ROOTS = ['src', 'public']
const QA_ALLOW_ROOTS = ['testes']

/** A subagent briefing may point at artifacts, never paste them. */
const BRIEFING_MAX_CHARS = 50_000

const UX_REF_RE = /\bUX-[A-Za-z0-9_-]+/g
const STATUS_RE = /^\s*status\s*:\s*([a-z_]+)\s*$/im
/** The human-only terminal state: no agent writes it. */
const DONE_RE = /^\s*status\s*:\s*done\b/im
const FROZEN_AFTER = new Set(['code_test', 'human_test', 'done'])

function log(msg) {
  console.log(`[dsh-tool-guard] ${msg}`)
}

function str(value) {
  return typeof value === 'string' ? value : ''
}

/** Delegation depth: 0 is the principal agent, >= 1 is a subagent. */
function delegationDepthOf(agent) {
  const runtime = agent?.options?.subagentDepth
  if (typeof runtime === 'number') return runtime
  const header = agent?.session?.header?.delegationDepth
  return typeof header === 'number' ? header : 0
}

/** True when `p` (resolved against cwd) names a file inside `<cwd>/<folder>`. */
function inside(cwd, p, folder) {
  const root = resolve(cwd, folder)
  const abs = resolve(cwd, p)
  const rel = relative(root, abs)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/** Minimal glob match for config names: `*` spans one path segment, nothing else. */
function globMatch(pattern, name) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/\\\\]*')
  return new RegExp(`^${escaped}$`, 'i').test(name)
}

/**
 * True when `p` names a config file DIRECTLY at the workspace root matching one
 * of `patterns`. A nested path (any separator) never matches: only the project
 * root's own configuration is the principal's tooling surface.
 */
function isRootConfigFile(cwd, p, patterns) {
  const rel = relative(resolve(cwd), resolve(cwd, p))
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return false
  if (rel.includes('/') || rel.includes('\\')) return false
  return patterns.some((pattern) => globMatch(pattern, rel))
}

/** First replacement character in `text`, as a code-unit offset; -1 when none. */
function firstFFFD(text) {
  return text.indexOf('\uFFFD')
}

/** The `status:` frontmatter value of a markdown string, if any. */
function frontmatterStatus(text) {
  const cut = text.indexOf('\n---')
  const head = text.startsWith('---') && cut !== -1 ? text.slice(0, cut) : text.slice(0, 800)
  const m = STATUS_RE.exec(head)
  return m ? m[1] : null
}

/**
 * The epic folder a path belongs to (`mds/epics/<epic>/…`), or null.
 * Accepts both separators because clients hand over either.
 */
function epicOf(cwd, file) {
  const abs = resolve(cwd, file)
  const mdsRoot = resolve(cwd, 'mds')
  const rel = relative(mdsRoot, abs)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  const parts = rel.split(/[\\/]/)
  if (parts[0] !== 'epics' || parts.length < 2) return null
  return parts[1]
}

/** Whether any ticket of the epic has moved past the build loop. */
function epicIsFrozen(cwd, epic) {
  const dir = resolve(cwd, 'mds', 'epics', epic, '06-tickets')
  if (!existsSync(dir)) return false
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.md')) continue
    const status = frontmatterStatus(readFileSync(resolve(dir, entry), 'utf8'))
    if (status && FROZEN_AFTER.has(status)) return true
  }
  return false
}

/** The `UX-*` ids declared in the epic's frozen prototype contract. */
function declaredUxIds(cwd, epic) {
  const file = resolve(cwd, 'mds', 'epics', epic, 'prototype.md')
  if (!existsSync(file)) return new Set()
  const ids = new Set()
  for (const m of readFileSync(file, 'utf8').matchAll(UX_REF_RE)) ids.add(m[0])
  return ids
}

/** The denial reason for a write/edit, or undefined to allow. */
function checkFs(exec, depth, role, allowedRoots, cwd) {
  const args = (typeof exec.arguments === 'object' && exec.arguments !== null) ? exec.arguments : {}
  const file = str(args.file_path)

  // Role-scoped write surface first: the allowlist IS the policy.
  if (role === 'builder') {
    if (!BUILDER_ALLOW_ROOTS.some((f) => inside(cwd, file, f)) && !isRootConfigFile(cwd, file, PROJECT_SCAFFOLD_FILES)) {
      return `GUARD[builder]: bloqueado — escrita fora de ${BUILDER_ALLOW_ROOTS.join('/, ')}/ e dos arquivos de raiz do projeto (${PROJECT_SCAFFOLD_FILES.join(', ')}) (got ${file || '<empty>'}); permitido só código — o teste é do principal`
    }
  } else if (role === 'qa') {
    if (!inside(cwd, file, QA_ALLOW_ROOTS[0]) && !isRootConfigFile(cwd, file, TEST_RUNNER_FILES)) {
      return `GUARD[qa]: bloqueado — escrita fora de testes/ e das configs de teste (${TEST_RUNNER_FILES.join(', ')}) (got ${file || '<empty>'}); qa só escreve testes`
    }
  } else if (depth === 0) {
    // The principal agent's law: process artifacts, the fast-fix code window,
    // and the config/tooling surface. testes/ stays qa-only; git stays with the
    // human.
    const allowed =
      allowedRoots.some((folder) => inside(cwd, file, folder)) ||
      PRINCIPAL_CODE_ROOTS.some((folder) => inside(cwd, file, folder)) ||
      DEFAULT_ALLOWED_TOOLING_ROOTS.some((folder) => inside(cwd, file, folder)) ||
      isRootConfigFile(cwd, file, PRINCIPAL_CONFIG_FILES) ||
      isRootConfigFile(cwd, file, PROJECT_SCAFFOLD_FILES) ||
      isRootConfigFile(cwd, file, TEST_RUNNER_FILES)
    if (!allowed) {
      return `Blocked: the principal agent writes only ${allowedRoots.join('/, ')}/, ${PRINCIPAL_CODE_ROOTS.join('/, ')}/, ${DEFAULT_ALLOWED_TOOLING_ROOTS.join('/, ')}/ and root config files (${[...PRINCIPAL_CONFIG_FILES, ...PROJECT_SCAFFOLD_FILES, ...TEST_RUNNER_FILES].join(', ')}) — testes/ is qa-only (got ${file || '<empty>'})`
    }
  }

  const content = exec.name === 'write' ? str(args.content) : str(args.new_string)

  // Encoding integrity: a file that was clean must never receive U+FFFD.
  if (content.includes('\uFFFD') && file) {
    const abs = resolve(cwd, file)
    if (!existsSync(abs) || !readFileSync(abs, 'utf8').includes('\uFFFD')) {
      return `GUARD[encoding]: bloqueado e nada foi gravado — o texto introduz U+FFFD (byte UTF-8 inválido) em ${file}; primeiro U+FFFD no offset ${content.indexOf('\uFFFD')}`
    }
  }

  const epic = epicOf(cwd, file)

  // The frozen prototype contract: once a ticket leaves the build loop, the
  // contract stops changing — amendments go to their own artifact.
  if (epic && basename(file).toLowerCase() === 'prototype.md' && epicIsFrozen(cwd, epic)) {
    return `GUARD[prototype]: bloqueado — prototype.md do épico está congelado (ticket em code_test ou além); emendas vão em arquivo próprio, nunca no congelado`
  }

  // Traceability: a ticket may only cite UX-* ids the prototype declares.
  if (epic && /06-tickets/.test(file) && content) {
    const cited = new Set(content.match(UX_REF_RE) ?? [])
    const declared = declaredUxIds(cwd, epic)
    const missing = [...cited].filter((id) => !declared.has(id))
    if (missing.length > 0) {
      return `GUARD[traceability]: bloqueado — ticket cita UX-* inexistente em prototype.md: ${missing.join(', ')}`
    }
  }

  // Kanban: the one transition rule — active only becomes in_progress.
  if (epic && /06-tickets/.test(file)) {
    const abs = resolve(cwd, file)
    const oldStatus = existsSync(abs) ? frontmatterStatus(readFileSync(abs, 'utf8')) : null
    const finalText = exec.name === 'edit'
      ? readFileSync(abs, 'utf8').replace(str(args.old_string), str(args.new_string))
      : str(args.content)
    const newStatus = frontmatterStatus(finalText)
    if (oldStatus === 'active' && newStatus !== oldStatus && newStatus !== 'in_progress') {
      return `GUARD[kanban]: bloqueado — ticket 'active' só vira 'in_progress' (tentativa: ${oldStatus} → ${newStatus ?? '<nenhum>'})`
    }
  }

  return undefined
}

/**
 * The guard body: returns a denial reason, or undefined to leave the call
 * unchanged. It is synchronous, as the guard contract requires.
 */
function check(exec, allowedRoots) {
  const args = (typeof exec.arguments === 'object' && exec.arguments !== null) ? exec.arguments : {}
  const agent = exec.agent
  const depth = agent === undefined ? 0 : delegationDepthOf(agent)
  const role = depth >= 1 && typeof agent?.options?.guardRole === 'string' ? agent.options.guardRole : undefined
  const cwd = str(agent?.session?.header?.cwd) || process.cwd()

  // Role-scoped tool denylist.
  if (role === 'builder' && (exec.name === 'browser' || exec.name === 'prototype_automation')) {
    return 'GUARD[builder]: bloqueado — tool de browser/prototype não é do builder; permitido só código — o teste é do principal'
  }
  if ((role === 'builder' || role === 'qa') && exec.name === 'subagent') {
    return `GUARD[${role}]: bloqueado — subagente não delega (spawn é do principal)`
  }

  // Shell policy: git for every agent (commits belong to the human); the rest
  // only for the fast builder.
  if (SHELL_TOOLS.has(exec.name)) {
    const command = str(args[SHELL_TOOLS.get(exec.name)])
    if (GIT_DENY_RE.test(command)) {
      if (depth === 0) {
        return `GUARD[principal]: bloqueado — git commit/push é do dono do projeto (humano)`
      }
      return `GUARD[${role ?? 'subagente'}]: bloqueado — git commit/push é do principal (todos os subagentes)`
    }
    if (role === 'builder' && depth >= 1 && (PG_DENY_RE.test(command) || NET_DENY_RE.test(command))) {
      return `GUARD[builder]: bloqueado — comando com rede externa/Postgres não é do builder; permitido só build e typecheck`
    }
  }

  // Briefing budget: point at the artifact, never paste it.
  if (exec.name === 'subagent' && str(args.prompt).length > 50_000) {
    return `GUARD[briefing]: bloqueado — prompt de subagente com ${str(args.prompt).length} chars (> ~50 KB); aponte o artefato, não cole`
  }

  if (GUARDED_FS.has(exec.name)) {
    // Done is the human's move on the Kanban: no agent writes it, at any depth.
    const text = exec.name === 'write' ? str(args.content) : str(args.new_string)
    if (DONE_RE.test(text)) {
      return 'Blocked: "status: done" is the human\'s move on the Kanban — never set it yourself'
    }
    return checkFs(exec, depth, role, allowedRoots, cwd)
  }
  return undefined
}

export function apply(ctx, config = {}) {
  const tools = ctx.get('tools')
  if (!tools || typeof tools.guard !== 'function') {
    log('tools service unavailable — guard not registered')
    return
  }
  const configured = config.allowedRoots
  const allowedRoots = Array.isArray(configured) && configured.length > 0 ? configured : DEFAULT_ALLOWED_ROOTS

  ctx.effect(() => tools.guard((exec) => check(exec, allowedRoots)), 'dsh-tool-guard: guard')
  log(`loaded (principal roots: ${allowedRoots.join(', ')})`)
}

/** Exposed for offline unit proofs only — not part of the plugin contract. */
export const __test = { check }