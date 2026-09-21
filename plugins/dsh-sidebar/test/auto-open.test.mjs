// Coverage for the central auto-open rules: config validation, glob matching,
// and that only a successful creation of a new, watched file becomes an event.
//
// Run: node --test test/*.test.mjs   (or: npm test)

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AutoOpenBoard, compileAutoOpen, globToRegExp, writeTargetOf } from '../lib/auto-open.js'

const ws = mkdtempSync(join(tmpdir(), 'sidebar-auto-open-'))
mkdirSync(join(ws, 'mds'), { recursive: true })
const RULES = compileAutoOpen([
  { tab: 'dsh-mds:artifacts', path: 'mds/**', reveal: true },
  { tab: 'dsh-prototype:view', path: 'prototype/**' },
])
const write = (file_path) => ({ name: 'write', arguments: { file_path }, agent: { session: { header: { cwd: ws } } } })

test('globs: ** spans folders, * stays in one segment', () => {
  assert.ok(globToRegExp('mds/**').test('mds/epics/a/01-brief.md'))
  assert.ok(!globToRegExp('mds/**').test('mdsx/a.md'))
  assert.ok(globToRegExp('prototype/*.html').test('prototype/index.html'))
  assert.ok(!globToRegExp('prototype/*.html').test('prototype/pages/a.html'))
  assert.ok(globToRegExp('**/notes.md').test('notes.md'))
})

test('config is validated at load', () => {
  assert.deepEqual(compileAutoOpen(undefined), [])
  assert.throws(() => compileAutoOpen({}), /must be a list/)
  assert.throws(() => compileAutoOpen([{ path: 'mds/**' }]), /tab must name a tab type/)
  assert.throws(() => compileAutoOpen([{ tab: 't', path: '../x' }]), /inside the workspace/)
  assert.throws(() => compileAutoOpen([{ tab: 't', path: 'x', reveal: 'yes' }]), /reveal must be a boolean/)
})

test('write targets resolve relative to the session workspace', () => {
  assert.equal(writeTargetOf(write('mds/a.md'))?.rel, 'mds/a.md')
  assert.equal(writeTargetOf(write(join(ws, 'prototype', 'index.html')))?.rel, 'prototype/index.html')
  assert.equal(writeTargetOf(write('../outside.md')), undefined)
  assert.equal(writeTargetOf({ ...write('mds/a.md'), name: 'edit' }), undefined)
})

test('a created file matching rules yields one event per rule, with reveal only where configured', () => {
  const board = new AutoOpenBoard(RULES)
  const mds = writeTargetOf(write('mds/epics/a/01-brief.md'))
  const proto = writeTargetOf(write('prototype/index.html'))
  board.before(mds); board.after(mds, false)
  board.before(proto); board.after(proto, false)
  assert.deepEqual(board.since(0).events, [
    { seq: 1, tab: 'dsh-mds:artifacts', path: 'mds/epics/a/01-brief.md', reveal: true },
    { seq: 2, tab: 'dsh-prototype:view', path: 'prototype/index.html', reveal: false },
  ])
  assert.deepEqual(board.since(2), { seq: 2, events: [] })
})

test('overwrites, failures and unwatched files produce nothing', () => {
  const board = new AutoOpenBoard(RULES)
  writeFileSync(join(ws, 'mds', 'exists.md'), '# old')
  for (const [file, failed] of [['mds/exists.md', false], ['mds/new.md', true], ['src/app.ts', false]]) {
    const target = writeTargetOf(write(file))
    board.before(target); board.after(target, failed)
  }
  assert.deepEqual(board.since(0), { seq: 0, events: [] })
})

test.after(() => rmSync(ws, { recursive: true, force: true }))
