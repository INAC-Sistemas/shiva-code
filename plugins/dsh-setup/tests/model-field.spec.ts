import { describe, expect, it } from 'vitest'
import { suggest } from '../src/client/ModelField.tsx'

const CATALOG = [
  { id: 'openai/text-embedding-3-small' },
  { id: 'baai/bge-m3' },
  { id: 'voyageai/voyage-4', name: 'Voyage 4' },
]

describe('suggesting model ids', () => {
  it('offers everything while the field is empty', () => {
    expect(suggest(CATALOG, '   ')).toEqual(CATALOG)
  })

  it('narrows a long catalog by id or display name, ignoring case', () => {
    expect(suggest(CATALOG, 'BGE').map(entry => entry.id)).toEqual(['baai/bge-m3'])
    expect(suggest(CATALOG, 'embedding').map(entry => entry.id)).toEqual(['openai/text-embedding-3-small'])
    expect(suggest(CATALOG, 'voyage 4').map(entry => entry.id)).toEqual(['voyageai/voyage-4'])
  })

  // What the field holds after a pick is a complete id, not a search, so the
  // list stays open on the whole catalog and another id is one click away.
  it('offers everything again once the field holds one of the ids', () => {
    expect(suggest(CATALOG, 'baai/bge-m3')).toEqual(CATALOG)
  })

  it('offers nothing for text no id carries, leaving the typed id to stand', () => {
    expect(suggest(CATALOG, 'nemotron')).toEqual([])
  })
})
