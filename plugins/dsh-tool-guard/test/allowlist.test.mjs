// Automated coverage for the dsh-tool-guard write allowlist.
//
// Drives the REAL guard registered by apply() (same code path the harness
// uses) and asserts what passes and what does not, so the rule cannot regress:
//   - the principal may edit config/tooling (.scripts/, root config files) and
//     keeps its product-code fast-fix window;
//   - testes/ stays qa-only for everyone but a qa agent;
//   - `status: done` is denied to every agent;
//   - a nested config path is not a root config file.
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
  assert.match(reason, /Blocked: the principal agent writes only/)
  assert.match(reason, /testes\/ is qa-only/)
})

test('principal: only ROOT config files match (nested paths denied)', () => {
  for (const file of ['sub/tsconfig.json', 'build/package.json', 'out/tsconfig.json', 'node_modules/x.js']) {
    assert.ok(write(file), `expected ${file} to be denied`)
  }
})

test('principal: paths outside the workspace are denied', () => {
  assert.ok(write('../fora.js'))
  assert.ok(write('C:/outro/lugar/tsconfig.json'))
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

test('builder and qa surfaces are unchanged (regression)', () => {
  const builder = { depth: 1, role: 'builder' }
  const qa = { depth: 1, role: 'qa' }
  assert.equal(write('src/app.js', 'x', builder), ALLOW)
  assert.ok(write('testes/x.js', 'x', builder), 'builder must not write testes/')
  assert.ok(write('tsconfig.json', 'x', builder), 'builder must not write root config')
  assert.equal(write('testes/x.test.js', 'x', qa), ALLOW)
  assert.ok(write('src/app.js', 'x', qa), 'qa must not write src/')
})

test('a denial names the rule and the allowed surface', () => {
  const reason = write('qualquer/arquivo.txt')
  assert.match(reason, /Blocked: the principal agent writes only/)
  assert.match(reason, /\.scripts\//)
  assert.match(reason, /tsconfig\.json/)
})

test.after(() => rmSync(ws, { recursive: true, force: true }))
