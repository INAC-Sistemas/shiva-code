// Coverage for the palette picker's host rules: preset data, selection and
// suggestion validation, and the request a tool call waits on.
//
// Run: node --test test/*.test.mjs   (or: npm test)

import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSelection, assertSuggestions, normalizeHex, PRESET_PALETTES } from '../lib/palettes.js'
import { PaletteRequests } from '../lib/requests.js'

test('hex colors normalize to #RRGGBB and anything else is refused', () => {
  assert.equal(normalizeHex('#0f766e'), '#0F766E')
  assert.equal(normalizeHex('abc'), '#AABBCC')
  assert.equal(normalizeHex('#12345'), undefined)
  assert.equal(normalizeHex('teal'), undefined)
})

test('presets have unique ids, five valid colors and known tags', () => {
  const tags = new Set(['popular', 'pastel', 'escura', 'vibrante', 'neutra', 'monocromatica'])
  assert.equal(new Set(PRESET_PALETTES.map((p) => p.id)).size, PRESET_PALETTES.length)
  for (const p of PRESET_PALETTES) {
    assert.equal(p.colors.length, 5, p.id)
    for (const c of p.colors) assert.equal(normalizeHex(c), c, `${p.id} ${c}`)
    for (const t of p.tags) assert.ok(tags.has(t), `${p.id} ${t}`)
  }
})

test('a selection is validated and normalized before it reaches the model', () => {
  const s = assertSelection({ source: 'custom', name: ' Minha ', colors: ['#0f766e', 'fff'], roles: { primary: '0f766e', background: '#FFF' } })
  assert.deepEqual(s, { source: 'custom', name: 'Minha', colors: ['#0F766E', '#FFFFFF'], roles: { primary: '#0F766E', background: '#FFFFFF' } })
  assert.throws(() => assertSelection({ source: 'x', colors: ['#fff'] }), /source/)
  assert.throws(() => assertSelection({ source: 'preset', colors: ['#GGG000'] }), /não é um hex/)
  assert.throws(() => assertSelection({ source: 'preset', colors: ['#fff'], roles: { primary: 'azul' } }), /primary/)
})

test('model suggestions are validated, not silently dropped', () => {
  const [s] = assertSuggestions([{ name: 'Confiança', colors: ['#0B1F3A', '#1D4ED8'], note: 'sóbria' }])
  assert.deepEqual(s, { id: 'sugestao-1', name: 'Confiança', colors: ['#0B1F3A', '#1D4ED8'], note: 'sóbria', tags: ['sugestao'] })
  assert.deepEqual(assertSuggestions(undefined), [])
  assert.throws(() => assertSuggestions([{ name: 'x', colors: ['#fff'] }]), /de 2 a 8 cores/)
  assert.throws(() => assertSuggestions([{ colors: ['#fff', '#000'] }]), /name é obrigatório/)
})

test('a tool call waits for the answer to its own request', async () => {
  const requests = new PaletteRequests()
  const call = requests.open('Qual paleta?', [], undefined)
  const pending = requests.pending()
  assert.equal(pending.question, 'Qual paleta?')
  assert.equal(requests.answer('palette-999', { cancelled: true }), false)
  assert.equal(requests.answer(pending.id, { source: 'preset', name: 'Oceano', colors: ['#03045E'], roles: {} }), true)
  assert.deepEqual(await call, { source: 'preset', name: 'Oceano', colors: ['#03045E'], roles: {} })
  assert.equal(requests.pending(), null)
})

test('one request at a time, and a cancelled turn closes it', async () => {
  const requests = new PaletteRequests()
  const controller = new AbortController()
  const call = requests.open('?', [], controller.signal)
  assert.throws(() => requests.open('outra', [], undefined), /já existe um pedido/)
  controller.abort(new Error('turno cancelado'))
  await assert.rejects(call, /turno cancelado/)
  assert.equal(requests.pending(), null)
})
