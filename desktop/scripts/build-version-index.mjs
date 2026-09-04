import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

function compare(a, b) {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  const preA = a.includes('-') ? a.slice(a.indexOf('-') + 1) : ''
  const preB = b.includes('-') ? b.slice(b.indexOf('-') + 1) : ''
  if (preA === preB) return 0
  if (!preA) return 1
  if (!preB) return -1
  return preA < preB ? -1 : 1
}

const RELEASES = 'https://github.com/INAC-Sistemas/shiva-code/releases'
const TAG_PREFIX = 'shiva-desktop-v'

/**
 * Turn a list of published version names into the version index the desktop
 * client reads from `versions.json` on the latest release. Non-semver names are
 * dropped; the rest sort newest first.
 */
export function buildVersionIndex(archiveDirNames) {
  const versions = [...new Set(archiveDirNames)]
    .filter((name) => SEMVER.test(name))
    .sort((a, b) => compare(b, a))
    .map((version) => ({
      version,
      tag: `${TAG_PREFIX}${version}`,
      archiveUrl: `${RELEASES}/download/${TAG_PREFIX}${version}/`
    }))
  return { generatedAt: new Date().toISOString(), versions }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [namesFile, outFile] = process.argv.slice(2)
  if (!namesFile || !outFile) {
    console.error('Usage: node scripts/build-version-index.mjs <names-json-file> <out-file>')
    process.exit(1)
  }
  const names = JSON.parse(await readFile(namesFile, 'utf8'))
  const index = buildVersionIndex(names)
  await writeFile(outFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outFile} with ${index.versions.length} versions.`)
}
