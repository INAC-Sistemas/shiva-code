// Automated coverage for the dsh-tool-guard write allowlist.
//
// Drives the REAL guard registered by apply() (same code path the harness
// uses) and asserts what passes and what does not, so the rule cannot regress:
//   - the principal writes mds/ and the whole product surface as its
//     fast-fix window, in any language or framework layout;
//   - testes/ stays qa-only and .git/ stays the human's;
//   - `status: done` is written only by the principal, never by a subagent;
//   - qa owns only the ROOT test-runner configs.
//
// Run: node --test test/   (or: npm test)

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
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

test('done is written only by the principal, never by a subagent', () => {
  const done = 'status: done'
  assert.equal(write('mds/epics/e/tarefas/01-login.md', done), ALLOW)
  assert.match(
    guard(exec('write', { file_path: 'src/x.js', content: done }, { depth: 1, role: 'builder' })),
    /only by the principal/,
  )
  assert.match(
    guard(exec('edit', { file_path: 'testes/x.js', old_string: 'a', new_string: done }, { depth: 1, role: 'qa' })),
    /only by the principal/,
  )
})

test('a tarefa in active only moves to in_progress', () => {
  mkdirSync(join(ws, 'mds/epics/e/tarefas'), { recursive: true })
  writeFileSync(join(ws, 'mds/epics/e/tarefas/02-clientes.md'), '---\nstatus: active\n---\n')
  const move = (to) => guard(exec('edit', {
    file_path: 'mds/epics/e/tarefas/02-clientes.md', old_string: 'status: active', new_string: `status: ${to}`,
  }))
  assert.match(move('code_test'), /GUARD\[kanban\]/)
  assert.equal(move('in_progress'), ALLOW)
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
  for (const file of ['mds/epics/e/01-brief.md', 'testes/x.test.js', '.git/config', '../fora.js', '/etc/hosts']) {
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

test('builder and evaluator never drive the browser; the principal does', () => {
  for (const role of ['builder', 'evaluator']) {
    for (const tool of ['browser', 'prototype_automation']) {
      assert.match(guard(exec(tool, { op: 'click' }, { depth: 1, role })), new RegExp(`GUARD\\[${role}\\]`))
    }
  }
  assert.equal(guard(exec('browser', { op: 'screenshot' })), ALLOW)
})

test('in a pipeline workspace every spawn names its role', () => {
  const plain = mkdtempSync(join(tmpdir(), 'guard-plain-'))
  const plainExec = { ...exec('subagent', { prompt: 'x' }), agent: { options: { subagentDepth: 0 }, session: { header: { cwd: plain, delegationDepth: 0 } } } }
  assert.equal(guard(plainExec), ALLOW, 'outside a pipeline workspace a role stays optional')
  rmSync(plain, { recursive: true, force: true })

  mkdirSync(join(ws, 'mds/epics/e'), { recursive: true })
  assert.match(guard(exec('subagent', { prompt: 'x' })), /todo subagente declara `role`/)
  assert.equal(guard(exec('subagent', { prompt: 'x', role: 'builder' })), ALLOW)
  assert.equal(guard(exec('subagent', { prompt: 'x', role: 'pesquisa' })), ALLOW)
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
  assert.match(reason, /Blocked: the principal agent writes mds\/ and the product/)
  assert.match(reason, /testes\/ is qa-only/)
})

/** Run a shell command through the guard; returns the denial reason or undefined. */
const bash = (command, opts) => guard(exec('bash', { command }, opts))

test('team developers write the product, in any layout', () => {
  for (const role of ['backend', 'frontend']) {
    const dev = { depth: 1, role }
    for (const file of ['src/app/page.tsx', 'prisma/schema.prisma', 'prisma/migrations/1_acesso/migration.sql', 'package.json', '.env', '.gitignore', 'vite.config.ts']) {
      assert.equal(write(file, 'x', dev), ALLOW, `${role} must write ${file}`)
    }
  }
})

test('team developers never write tests, scratch scripts or outside the workspace', () => {
  for (const role of ['backend', 'frontend']) {
    const dev = { depth: 1, role }
    for (const file of ['testes/00/a.test.ts', 'src/lib/api.test.ts', 'src/app/page.spec.tsx', 'vitest.config.ts', 'playwright.config.ts', '.verificacao/verificar-casca.mjs', 'src/.tmp/check.mjs', '/tmp/verif-casa/verificar.mjs', '.git/config']) {
      assert.match(write(file, 'x', dev), new RegExp(`GUARD\\[${role}\\]`), `${role} must not write ${file}`)
    }
  }
})

test('team developers write only their own epic artifacts under mds/', () => {
  assert.equal(write('mds/epics/e/decisoes.md', 'x', { depth: 1, role: 'backend' }), ALLOW)
  assert.equal(write('mds/epics/e/decisoes.md', 'x', { depth: 1, role: 'frontend' }), ALLOW)
  assert.equal(write('mds/epics/e/02-design.md', 'x', { depth: 1, role: 'frontend' }), ALLOW)
  assert.match(write('mds/epics/e/02-design.md', 'x', { depth: 1, role: 'backend' }), /GUARD\[backend\]/)
  for (const role of ['backend', 'frontend']) {
    for (const file of ['mds/epics/e/tarefas/00-fundacao.md', 'mds/epics/e/01-arquitetura.md', 'mds/notas.md']) {
      assert.match(write(file, 'x', { depth: 1, role }), /tarefas e arquitetura são do gerente/, `${role} must not write ${file}`)
    }
  }
})

test('team developers install packages and run checks, but never a test suite or a scratch script', () => {
  for (const role of ['backend', 'frontend']) {
    const dev = { depth: 1, role }
    for (const command of ['pnpm add zod jose', 'pnpm add -D prisma vitest', 'npm install', 'pnpm check', 'npm run check', 'pnpm typecheck', 'pnpm prisma migrate dev --name acesso', 'node -e "1"', 'node scripts/seed.mjs', 'curl -s http://localhost:4300/api']) {
      assert.equal(bash(command, dev), ALLOW, `${role} must run ${command}`)
    }
    for (const command of ['pnpm test', 'cd /w && timeout 600 pnpm test 2>&1 | tail -35', 'npm run test:e2e', 'pnpm exec vitest list', 'npx playwright test', 'pnpm install && pnpm test', 'node --test testes/']) {
      assert.match(bash(command, dev), /rodar suíte de teste é do tester/, `${role} must not run ${command}`)
    }
    for (const command of ['node .verificacao/verificar-casca.mjs', 'cd /tmp/v && node /tmp/v/verificar.mjs']) {
      assert.match(bash(command, dev), /script de verificação fora do produto/, `${role} must not run ${command}`)
    }
  }
})

test('the frontend drives the browser for its preview; the backend does not', () => {
  assert.equal(guard(exec('browser', { op: 'screenshot' }, { depth: 1, role: 'frontend' })), ALLOW)
  assert.match(guard(exec('browser', { op: 'navigate' }, { depth: 1, role: 'backend' })), /GUARD\[backend\]/)
})

test.after(() => rmSync(ws, { recursive: true, force: true }))
