// Automated coverage for the dsh-tool-guard write allowlist.
//
// Drives the REAL guard registered by apply() (same code path the harness
// uses) and asserts what passes and what does not, so the rule cannot regress:
//   - the principal writes mds/, prototype/ and the whole product surface as its
//     fast-fix window, in any language or framework layout;
//   - testes/ stays qa-only and .git/ stays the human's;
//   - `status: done` is denied to every agent;
//   - qa owns only the ROOT test-runner configs.
//
// Run: node --test test/   (or: npm test)

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../lib/index.js'

const ws = mkdtempSync(join(tmpdir(), 'guard-allowlist-'))
for (const dir of ['.scripts', 'src', 'public', 'testes', 'mds', 'prototype', 'sub', 'build', 'node_modules']) {
  mkdirSync(join(ws, dir), { recursive: true })
}

let guard
apply(
  { get: () => ({ guard: (fn) => { guard = fn } }), effect: (reg) => reg() },
  {},
)
assert.equal(typeof guard, 'function', 'apply() must register a guard')

/** Build one tool-execution record with the given role/depth. */
function exec(name, args, { depth = 0, role } = {}) {
  return {
    name,
    arguments: args,
    agent: {
      options: { subagentDepth: depth, ...(role ? { guardRole: role } : {}) },
      session: { header: { cwd: ws, delegationDepth: depth } },
    },
  }
}

/** Run a write through the guard; returns the denial reason or undefined. */
const write = (file, content = 'x', opts) => guard(exec('write', { file_path: file, content }, opts))

const ALLOW = undefined

test('principal: config & tooling paths are allowed', () => {
  const allowed = [
    '.scripts/copiar-fila-local.js',
    'tsconfig.json',
    'tsconfig.node.json',
    'package.json',
    'package-lock.json',
    '.railwayignore',
    '.gitignore',
    'railway.toml',
  ]
  for (const file of allowed) {
    assert.equal(write(file), ALLOW, `expected ${file} to be allowed`)
  }
})

test('principal: product code and artifacts stay allowed (unchanged)', () => {
  for (const file of ['src/app.js', 'public/logo.svg', 'mds/epic/x.md', 'prototype/index.html']) {
    assert.equal(write(file), ALLOW, `expected ${file} to be allowed`)
  }
})

test('principal: testes/ is denied with a clear message', () => {
  const reason = write('testes/qualquer.test.js')
  assert.match(reason, /Blocked: the principal agent writes/)
  assert.match(reason, /testes\/ is qa-only/)
})

test('principal: the fast-fix window is the whole product, in any layout', () => {
  for (const file of ['app/page.tsx', 'components/ui/button.tsx', 'lib/server/users.ts', 'Dockerfile', 'docker/entrypoint.sh', 'frontend/src/main.tsx', 'sub/tsconfig.json']) {
    assert.equal(write(file), ALLOW, `expected ${file} to be allowed`)
  }
  assert.ok(write('.git/config'), '.git/ is the human\'s')
})

test('principal: paths outside the workspace are denied', () => {
  assert.ok(write('../fora.js'))
  assert.ok(write('/etc/hosts'))
  // A drive path is absolute only on Windows; on POSIX it names a folder `C:`.
  if (process.platform === 'win32') assert.ok(write('C:/outro/lugar/tsconfig.json'))
})

test('done is denied to every agent, even on an allowed path', () => {
  const ticket = 'status: done'
  assert.match(write('.scripts/x.js', ticket), /human's move/)
  assert.match(
    guard(exec('write', { file_path: 'src/x.js', content: ticket }, { depth: 1, role: 'builder' })),
    /human's move/,
  )
  assert.match(
    guard(exec('edit', { file_path: 'testes/x.js', old_string: 'a', new_string: ticket }, { depth: 1, role: 'qa' })),
    /human's move/,
  )
})

test('builder writes any language or framework layout inside the workspace', () => {
  const builder = { depth: 1, role: 'builder' }
  for (const file of [
    'src/app.js', 'public/logo.svg', 'index.html', 'vite.config.ts', 'components.json', 'package.json',
    'app/Http/Controllers/UserController.php', 'routes/api.php', 'resources/js/app.tsx', 'composer.json',
    'cmd/server/main.go', 'internal/users/service.go', 'go.mod',
    'backend/manage.py', 'frontend/src/main.tsx', 'Cargo.toml',
  ]) {
    assert.equal(write(file, 'x', builder), ALLOW, `builder must write ${file}`)
  }
})

test('builder never writes the process surfaces, tests, git or outside the workspace', () => {
  const builder = { depth: 1, role: 'builder' }
  for (const file of ['mds/epics/e/01-brief.md', 'prototype/index.html', 'testes/x.test.js', '.git/config', '../fora.js', '/etc/hosts']) {
    assert.ok(write(file, 'x', builder), `builder must not write ${file}`)
  }
})

test('the evaluator writes nothing at all, and delegates nothing', () => {
  const evaluator = { depth: 1, role: 'evaluator' }
  for (const file of ['src/app.js', 'testes/x.test.js', 'mds/epics/e/01-brief.md', 'package.json', 'app/page.tsx']) {
    assert.match(write(file, 'x', evaluator), /GUARD\[evaluator\]/, `evaluator must not write ${file}`)
  }
  assert.match(
    guard(exec('subagent', { prompt: 'x' }, evaluator)),
    /subagente não delega/,
  )
})

test('qa surface is unchanged (regression)', () => {
  const qa = { depth: 1, role: 'qa' }
  assert.equal(write('testes/x.test.js', 'x', qa), ALLOW)
  assert.ok(write('src/app.js', 'x', qa), 'qa must not write src/')
})

test('the web project scaffold at the root is writable by the principal', () => {
  for (const file of [
    'index.html', 'vite.config.js', 'vite.config.ts', 'next.config.mjs',
    'tailwind.config.ts', 'postcss.config.cjs', 'eslint.config.js', 'components.json',
  ]) {
    assert.equal(write(file), ALLOW, `principal must write ${file}`)
  }
})

test('qa owns the test-runner configs, and nothing else at the root', () => {
  const qa = { depth: 1, role: 'qa' }
  assert.equal(write('vitest.config.ts', 'x', qa), ALLOW)
  assert.equal(write('playwright.config.ts', 'x', qa), ALLOW)
  assert.ok(write('vite.config.ts', 'x', qa), 'qa must not write the build config')
  assert.equal(write('vitest.config.ts'), ALLOW, 'the principal may write it too')
})

test('a denial names the rule and the allowed surface', () => {
  const reason = write('testes/qualquer.test.js')
  assert.match(reason, /Blocked: the principal agent writes mds\/, prototype\//)
  assert.match(reason, /testes\/ is qa-only/)
})

test.after(() => rmSync(ws, { recursive: true, force: true }))
