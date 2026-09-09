import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const DIST_ROOT = fileURLToPath(new URL('../dist', import.meta.url))

it('ships install metadata with the built web application', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest" />')

  const manifest: unknown = JSON.parse(await readFile(join(DIST_ROOT, 'manifest.webmanifest'), 'utf8'))
  expect(manifest).toEqual({
    id: '/',
    name: 'DeepSeek Harness',
    short_name: 'DSH',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    icons: [{
      src: '/favicon.png',
      sizes: '256x256',
      type: 'image/png',
      purpose: 'any',
    }],
  })
})

it('ships a favicon at the size the manifest and the icon link declare', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<link rel="icon" type="image/png" href="/favicon.png" />')

  // The declared size is a promise to the installer, which picks an icon by it
  // without decoding the file: read it back off the PNG header (IHDR width and
  // height, big-endian, at byte 16) rather than trusting the manifest alone.
  const favicon = await readFile(join(DIST_ROOT, 'favicon.png'))
  expect(favicon.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(favicon.readUInt32BE(16)).toBe(256)
  expect(favicon.readUInt32BE(20)).toBe(256)
})
