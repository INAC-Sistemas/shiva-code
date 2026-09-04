import type { AvailableRelease } from '../../shared/contracts'

export type { AvailableRelease }

/**
 * Releases of this repository host the update feed. The desktop release
 * workflow is the only thing here that publishes a GitHub Release, and it marks
 * every one of them `--latest`, so `latest/download/` always resolves to a
 * desktop release rather than to a harness or vendor tag.
 *
 * Every feed built from this base must set `useMultipleRangeRequest: false`.
 * `electron-updater` enables multi-range downloads for any non-S3 URL, and
 * GitHub's release-asset CDN answers a multi-range request with 501, which
 * costs two blockmap fetches and a failed request before each update falls back
 * to a full download. Single-range requests do work, so differential downloads
 * stay available.
 */
const RELEASES = 'https://github.com/INAC-Sistemas/shiva-code/releases'

/** Prefix of the release tags this app is published under; `dsh-v*` is the harness. */
export const RELEASE_TAG_PREFIX = 'shiva-desktop-v'

export const STABLE_FEED_URL = `${RELEASES}/latest/download/`
export const VERSION_INDEX_URL = `${RELEASES}/latest/download/versions.json`

const INDEX_TIMEOUT_MS = 8_000

/**
 * Feed base for one published version, used to install a specific release.
 *
 * The trailing slash is load-bearing: `electron-updater` resolves the installer
 * name in `latest.yml` against this as a URL base.
 *
 * @param version Semver of the release, without the tag prefix.
 * @returns Absolute URL of that release's asset directory.
 */
export function archiveFeedUrl(version: string): string {
  return `${RELEASES}/download/${RELEASE_TAG_PREFIX}${version}/`
}

/** Split "1.2.3-rc.1" into ([1,2,3], "rc.1"). Non-numeric segments read as 0. */
function splitVersion(value: string): { nums: number[]; pre: string } {
  const [core = '', ...preParts] = value.trim().split('-')
  const nums = core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  while (nums.length < 3) nums.push(0)
  return { nums, pre: preParts.join('-') }
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = splitVersion(a)
  const right = splitVersion(b)
  for (let i = 0; i < Math.max(left.nums.length, right.nums.length); i += 1) {
    const diff = (left.nums[i] ?? 0) - (right.nums[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  if (left.pre === right.pre) return 0
  if (!left.pre) return 1 // release > prerelease
  if (!right.pre) return -1
  return left.pre < right.pre ? -1 : 1
}

function isRelease(value: unknown): value is AvailableRelease {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'string' &&
    record.version.length > 0 &&
    typeof record.tag === 'string' &&
    record.tag.length > 0 &&
    typeof record.archiveUrl === 'string' &&
    record.archiveUrl.length > 0
  )
}

export function parseVersionIndex(raw: unknown): AvailableRelease[] {
  if (typeof raw !== 'object' || raw === null) return []
  const versions = (raw as { versions?: unknown }).versions
  if (!Array.isArray(versions)) return []
  return versions.filter(isRelease)
}

export async function fetchAvailableReleases(
  currentVersion: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<AvailableRelease[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INDEX_TIMEOUT_MS)
  try {
    const response = await fetchImpl(VERSION_INDEX_URL, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Version index request failed: ${response.status}`)
    }
    const releases = parseVersionIndex(await response.json())
    return releases
      .filter((release) => compareVersions(release.version, currentVersion) !== 0)
      .sort((a, b) => compareVersions(b.version, a.version))
  } finally {
    clearTimeout(timer)
  }
}
