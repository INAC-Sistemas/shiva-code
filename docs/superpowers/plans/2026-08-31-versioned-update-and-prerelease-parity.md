# Versioned Update Rollback + Prerelease Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users install/roll back to any past production version from the update panel, and make `workflow_dispatch` prereleases byte-for-byte identical to `v*` releases (signed macOS + Windows), published to isolated locations.

**Architecture:** Client side reuses the existing `electron-updater` pipeline by temporarily pointing its feed URL at a per-version archive directory with `allowDowngrade` enabled, then restoring the stable feed. A `versions.json` index (regenerated each release by listing the ModelScope `releases/archive/` directory) drives the version picker. CI side introduces a `prerelease_tag` input that routes every build job through the production package + sign + notarize path, gated by an `isRelease` predicate, publishing to `--prerelease` GitHub releases and `releases/prerelease/<tag>/` on ModelScope.

**Tech Stack:** TypeScript (Electron main + preload), `electron-updater`, Vitest, Node ESM scripts (`.mjs`), GitHub Actions, ModelScope `HubApi` (Python, in-workflow).

## Global Constraints

- Reply/commit language for this repo follows existing conventions; UI copy must ship both `zh` and `en` strings (existing pattern: `'跳过此版本'` / `'Skip this version'`).
- No new runtime dependency for semver handling — ship a local 3-segment comparator (`src/main/version-info.ts` currently carries no semver dep; keep it that way).
- Client only depends on the domain `dshdesktop.com`; never hardcode a ModelScope URL in client code.
- Rollback is **one-time**: after installing a chosen version the app resumes normal `latest` auto-updates (no version pinning).
- Prereleases are **not** rollback targets: never add them to `versions.json`, never write to `releases/latest/` or `releases/archive/` for a prerelease, never send the Feishu notification for a prerelease.
- `autoUpdater.autoDownload` stays `false`; `autoUpdater.allowPrerelease` stays `false`.
- Update-manager unit coverage in this repo is done by **source-string assertion** (read the file, `expect(source).toContain(...)`) — see `test/update-skip.test.ts`. There is no `electron` mock. Follow that pattern; do not introduce an electron mock.
- `isRelease` predicate (inline in every `if:` that needs it, GitHub Actions has no variables):
  `startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != ''`
- Commands: tests `npm test` (`vitest run`); a single file `npx vitest run test/<file>`; types `npm run typecheck`.

---

## File Structure

**Created:**
- `src/main/update/version-catalog.ts` — feed-URL constants, `compareVersions`, `parseVersionIndex`, `fetchAvailableReleases`. Pure + injectable `fetch`.
- `scripts/build-version-index.mjs` — `buildVersionIndex(archiveDirNames)` pure function + CLI (`<names-json-file> <out-file>`).
- `test/version-catalog.test.ts`
- `test/build-version-index.test.ts`

**Modified:**
- `src/shared/contracts.ts` — `UpdateStatus.downgrade?`, new `AvailableRelease`, IPC channel doc.
- `src/main/update/update-state.ts` — pass `downgrade` through `reduceUpdateStatus`.
- `src/main/update/update-manager.ts` — `updates:list-versions` + `updates:install-version` handlers, `installSpecificVersion`, `pendingDowngrade`, `configureUpdater` sets `allowDowngrade = false`.
- `src/preload/index.ts` — "Install another version…" entry, version list rendering, downgrade confirm, `updates:install-version` invoke.
- `src/preload/update-view.ts` — downgrade headline/message copy.
- `.github/workflows/release.yml` — `prerelease_tag` input, `isRelease` gating, smoke-test parametrization, `sign-windows` gate, remove inline prerelease publish step, new `publish-prerelease` job, `publish` archive-upload + index step, `publish` gains `inputs.prerelease_tag == ''`.
- `test/update-state.test.ts` — `downgrade` passthrough cases.
- `test/update.test.ts` — `installSpecificVersion` source assertions.
- `test/update-ui.test.ts` — downgrade copy.
- `test/release.test.ts` — workflow contract assertions.

---

## Task 1: Client version catalog (pure logic)

**Files:**
- Create: `src/main/update/version-catalog.ts`
- Test: `test/version-catalog.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const STABLE_FEED_URL = 'https://dshdesktop.com/updates/latest/'`
  - `export const VERSION_INDEX_URL = 'https://dshdesktop.com/updates/versions.json'`
  - `export function archiveFeedUrl(version: string): string`
  - `export function compareVersions(a: string, b: string): -1 | 0 | 1`
  - `export interface AvailableRelease { version: string; tag: string; archiveUrl: string }`
  - `export function parseVersionIndex(raw: unknown): AvailableRelease[]`
  - `export function fetchAvailableReleases(currentVersion: string, fetchImpl?: typeof fetch): Promise<AvailableRelease[]>`

- [ ] **Step 1: Write the failing test**

```ts
// test/version-catalog.test.ts
import { describe, expect, it } from 'vitest'
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  parseVersionIndex,
  STABLE_FEED_URL,
  VERSION_INDEX_URL
} from '../src/main/update/version-catalog'

describe('version-catalog constants', () => {
  it('points the stable feed and index at the dshdesktop domain', () => {
    expect(STABLE_FEED_URL).toBe('https://dshdesktop.com/updates/latest/')
    expect(VERSION_INDEX_URL).toBe('https://dshdesktop.com/updates/versions.json')
  })

  it('builds a per-version archive feed url with a trailing slash', () => {
    expect(archiveFeedUrl('1.2.3')).toBe('https://dshdesktop.com/updates/archive/1.2.3/')
  })
})

describe('compareVersions', () => {
  it('orders by numeric segments', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('treats a prerelease as lower than its release', () => {
    expect(compareVersions('1.2.3-rc.1', '1.2.3')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3-rc.1')).toBe(1)
    expect(compareVersions('1.2.3-rc.1', '1.2.3-rc.2')).toBe(-1)
  })
})

describe('parseVersionIndex', () => {
  it('keeps well-formed entries and drops the rest', () => {
    const raw = {
      versions: [
        { version: '1.2.3', tag: 'v1.2.3', archiveUrl: 'https://dshdesktop.com/updates/archive/1.2.3/' },
        { version: '', tag: 'v0', archiveUrl: 'x' },
        { nope: true },
        42
      ]
    }
    expect(parseVersionIndex(raw)).toEqual([
      { version: '1.2.3', tag: 'v1.2.3', archiveUrl: 'https://dshdesktop.com/updates/archive/1.2.3/' }
    ])
  })

  it('returns an empty array for non-objects or a missing versions array', () => {
    expect(parseVersionIndex(null)).toEqual([])
    expect(parseVersionIndex({})).toEqual([])
    expect(parseVersionIndex('nope')).toEqual([])
  })
})

describe('fetchAvailableReleases', () => {
  const index = {
    versions: [
      { version: '1.0.0', tag: 'v1.0.0', archiveUrl: 'a' },
      { version: '1.2.0', tag: 'v1.2.0', archiveUrl: 'b' },
      { version: '1.1.0', tag: 'v1.1.0', archiveUrl: 'c' }
    ]
  }
  const ok = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(index) } as Response)

  it('drops the current version and sorts descending', async () => {
    const releases = await fetchAvailableReleases('1.1.0', ok as unknown as typeof fetch)
    expect(releases.map((r) => r.version)).toEqual(['1.2.0', '1.0.0'])
  })

  it('throws when the request fails', async () => {
    const bad = () => Promise.resolve({ ok: false, status: 503 } as Response)
    await expect(
      fetchAvailableReleases('1.1.0', bad as unknown as typeof fetch)
    ).rejects.toThrow()
  })

  it('throws when the network rejects', async () => {
    const boom = () => Promise.reject(new Error('offline'))
    await expect(
      fetchAvailableReleases('1.1.0', boom as unknown as typeof fetch)
    ).rejects.toThrow('offline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/version-catalog.test.ts`
Expected: FAIL — cannot resolve `../src/main/update/version-catalog`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/main/update/version-catalog.ts
export const STABLE_FEED_URL = 'https://dshdesktop.com/updates/latest/'
export const VERSION_INDEX_URL = 'https://dshdesktop.com/updates/versions.json'

const INDEX_TIMEOUT_MS = 8_000

export function archiveFeedUrl(version: string): string {
  return `https://dshdesktop.com/updates/archive/${version}/`
}

export interface AvailableRelease {
  version: string
  tag: string
  archiveUrl: string
}

/** Split "1.2.3-rc.1" into ([1,2,3], "rc.1"). Non-numeric segments read as 0. */
function splitVersion(value: string): { nums: number[]; pre: string } {
  const [core, ...preParts] = value.trim().split('-')
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/version-catalog.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/main/update/version-catalog.ts test/version-catalog.test.ts
git commit -m "feat(update): version catalog for rollback targets"
```

---

## Task 2: Contracts + reducer carry the downgrade flag

**Files:**
- Modify: `src/shared/contracts.ts` (the `UpdateStatus` interface near line 28)
- Modify: `src/main/update/update-state.ts`
- Test: `test/update-state.test.ts`

**Interfaces:**
- Consumes: `AvailableRelease` from Task 1 (re-exported through contracts for preload use).
- Produces:
  - `UpdateStatus` gains `downgrade?: boolean`
  - `contracts.ts` re-exports `export type { AvailableRelease } from '../main/update/version-catalog'` — verify this import path is allowed from `src/shared`; if `src/shared` may not import from `src/main`, instead declare `AvailableRelease` in `contracts.ts` and have `version-catalog.ts` import it from there. **Pick the direction that matches existing import rules and use it consistently.**
  - `reduceUpdateStatus` preserves `current.downgrade` on every non-`reset` event and clears it on `reset`.

- [ ] **Step 1: Write the failing test** (append to `test/update-state.test.ts`)

```ts
import { initialUpdateStatus, reduceUpdateStatus } from '../src/main/update/update-state'

describe('downgrade flag', () => {
  it('carries downgrade through transient events and clears it on reset', () => {
    const base = { ...initialUpdateStatus('1.5.0'), downgrade: true }
    expect(reduceUpdateStatus(base, { type: 'available', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'progress', percent: 40 }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'downloaded', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'reset' }).downgrade).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/update-state.test.ts`
Expected: FAIL — `downgrade` is `undefined` on the reduced status.

- [ ] **Step 3: Write minimal implementation**

In `src/shared/contracts.ts`, add to `UpdateStatus`:

```ts
  manual: boolean
  downgrade?: boolean
```

In `src/main/update/update-state.ts`, change `base` and the `progress` branch so `downgrade` survives:

```ts
  const base = {
    currentVersion: current.currentVersion,
    manual: current.manual,
    downgrade: current.downgrade
  }
```

The `progress` branch already spreads `...current`, so it keeps `downgrade` automatically. The `reset` branch returns `initialUpdateStatus(...)` which has no `downgrade` — leave it, that is the clear.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/update-state.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/contracts.ts src/main/update/update-state.ts test/update-state.test.ts
git commit -m "feat(update): thread downgrade flag through update status"
```

---

## Task 3: Update manager — list + install a specific version

**Files:**
- Modify: `src/main/update/update-manager.ts`
- Test: `test/update.test.ts`

**Interfaces:**
- Consumes: `archiveFeedUrl`, `STABLE_FEED_URL`, `compareVersions`, `fetchAvailableReleases` (Task 1); `UpdateStatus.downgrade` (Task 2); existing `downloadAvailableUpdate`, `transition`, `scheduleReset`, `manualCheck`, `checkPromise`, `getUpdateStatus`, `supportsUpdates` in this file.
- Produces:
  - IPC `updates:list-versions` → `Promise<AvailableRelease[]>`
  - IPC `updates:install-version` (`version: unknown`) → `Promise<UpdateStatus>`
  - `export async function installSpecificVersion(version: unknown): Promise<UpdateStatus>`

- [ ] **Step 1: Write the failing test** (append to `test/update.test.ts`)

```ts
import { readFile as readFileFs } from 'node:fs/promises'

describe('installing a specific version', () => {
  it('wires the list and install IPC handlers and the downgrade-safe feed swap', async () => {
    const manager = await readFileFs(
      path.join(projectRoot, 'src/main/update/update-manager.ts'),
      'utf8'
    )
    expect(manager).toContain("ipcMain.handle('updates:list-versions'")
    expect(manager).toContain("ipcMain.handle('updates:install-version'")
    expect(manager).toContain('fetchAvailableReleases(app.getVersion())')
    expect(manager).toContain('export async function installSpecificVersion')
    // Feed is pointed at the per-version archive, then always restored.
    expect(manager).toContain('archiveFeedUrl(version)')
    expect(manager).toContain('autoUpdater.allowDowngrade = true')
    expect(manager).toContain('setFeedURL({ provider: \'generic\', url: STABLE_FEED_URL })')
    // Guard against the residual-allowDowngrade risk on next launch.
    expect(manager).toContain('autoUpdater.allowDowngrade = false')
    // After a successful check for the requested version, download without a second click.
    expect(manager).toContain('downloadAvailableUpdate()')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/update.test.ts`
Expected: FAIL — none of the new strings are present.

- [ ] **Step 3: Write minimal implementation**

Add imports at the top of `update-manager.ts`:

```ts
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  STABLE_FEED_URL
} from './version-catalog'
```

Add a module-level flag beside the other `let` declarations:

```ts
let pendingDowngrade = false
```

In `configureUpdater()`, right after `autoUpdater.autoDownload = false`:

```ts
  autoUpdater.allowDowngrade = false
```

In `registerUpdateHandlers()`, add:

```ts
  ipcMain.handle('updates:list-versions', () => fetchAvailableReleases(app.getVersion()))
  ipcMain.handle('updates:install-version', (_event, version: unknown) =>
    installSpecificVersion(version)
  )
```

Add the function (near `downloadAvailableUpdate`):

```ts
/**
 * Install a specific past release, downgrades included. The feed is pointed at
 * that version's archive directory for one check+download, then restored to the
 * stable channel. A successful install resumes normal `latest` auto-updates.
 */
export async function installSpecificVersion(version: unknown): Promise<UpdateStatus> {
  if (typeof version !== 'string' || !version) return getUpdateStatus()
  if (!supportsUpdates()) return getUpdateStatus()
  if (checkPromise || ['checking', 'downloading', 'downloaded'].includes(status.phase)) {
    return getUpdateStatus()
  }

  pendingDowngrade = compareVersions(version, app.getVersion()) < 0
  autoUpdater.setFeedURL({ provider: 'generic', url: archiveFeedUrl(version) })
  autoUpdater.allowDowngrade = true
  manualCheck = true
  transition({ type: 'check', manual: true })
  if (pendingDowngrade) status.downgrade = true
  lastCheckedAt = Date.now()
  checkPromise = autoUpdater.checkForUpdates()

  try {
    await checkPromise
    if (status.phase === 'available' && status.availableVersion === version) {
      await downloadAvailableUpdate()
    } else if (status.phase !== 'downloading' && status.phase !== 'downloaded') {
      transition({ type: 'error', message: '在更新源未找到该版本' })
      scheduleReset()
    }
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
    scheduleReset()
  } finally {
    checkPromise = undefined
    autoUpdater.setFeedURL({ provider: 'generic', url: STABLE_FEED_URL })
    autoUpdater.allowDowngrade = false
    pendingDowngrade = false
  }

  return getUpdateStatus()
}
```

In `transition()`, after `status = reduceUpdateStatus(status, event)`:

```ts
  if (pendingDowngrade && event.type !== 'reset') status.downgrade = true
```

(`reduceUpdateStatus` from Task 2 already preserves `downgrade` across events and clears it on `reset`; this line keeps re-stamping it while the pinned flow is active.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/update.test.ts test/update-skip.test.ts && npm run typecheck`
Expected: PASS; typecheck clean; `update-skip` still green (it asserts `updates:download` / `autoDownload` strings that remain).

- [ ] **Step 5: Commit**

```bash
git add src/main/update/update-manager.ts test/update.test.ts
git commit -m "feat(update): install or roll back to a specific version"
```

---

## Task 4: Preload — version picker + downgrade copy

**Files:**
- Modify: `src/preload/update-view.ts`
- Modify: `src/preload/index.ts`
- Test: `test/update-ui.test.ts`

**Interfaces:**
- Consumes: IPC `updates:list-versions`, `updates:install-version` (Task 3); `UpdateStatus.downgrade` (Task 2).
- Produces:
  - `updateHeadline(status, locale)` and `updateMessage(status, locale)` return downgrade-specific text when `status.downgrade` is true and `status.availableVersion` is set.
  - `src/preload/index.ts` renders an "Install another version…" / "安装其它版本…" control that lists versions and calls `updates:install-version` after a confirm.

- [ ] **Step 1: Write the failing test**

First read `test/update-ui.test.ts` and `src/preload/update-view.ts` to match the exact `updateHeadline` / `updateMessage` shape and existing locale-copy test style. Then append:

```ts
describe('downgrade copy', () => {
  it('names the downgrade in both locales', () => {
    const status = {
      phase: 'downloading' as const,
      currentVersion: '1.5.0',
      availableVersion: '1.2.0',
      manual: true,
      downgrade: true,
      percent: 30
    }
    expect(updateHeadline(status, 'zh').title).toContain('降级')
    expect(updateMessage(status, 'zh')).toContain('1.2.0')
    expect(updateHeadline(status, 'en').title.toLowerCase()).toContain('downgrad')
    expect(updateMessage(status, 'en')).toContain('1.2.0')
  })
})
```

Adjust the imported names/paths to whatever `test/update-ui.test.ts` already imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/update-ui.test.ts`
Expected: FAIL — headline/message do not mention a downgrade.

- [ ] **Step 3: Write minimal implementation**

In `src/preload/update-view.ts`, in `updateHeadline`, before the existing `available`/`downloading`/`downloaded` handling, branch on `status.downgrade`:

```ts
  if (status.downgrade && status.availableVersion) {
    const v = status.availableVersion
    if (locale === 'zh') {
      return {
        title: `正在降级到 v${v}`,
        description: `将把当前 ${status.currentVersion} 回退到 ${v}`
      }
    }
    return {
      title: `Downgrading to v${v}`,
      description: `Rolling back ${status.currentVersion} to ${v}`
    }
  }
```

In `updateMessage`, add an equivalent early branch that includes `status.availableVersion` in both locales (match the function's existing return type — a plain string).

In `src/preload/index.ts`:
1. Find where the update card buttons are built (search `updates:download` around line 425 and `skipButton` around line 484).
2. Add a text button/link labelled `locale === 'zh' ? '安装其它版本…' : 'Install another version…'`.
3. On click: `const releases = await ipcRenderer.invoke('updates:list-versions')` (wrap in try/catch; on failure render inline text `'暂时无法获取版本列表'` / `'Unable to load version list'`).
4. Render `releases` as a simple list. Group by `compareVersions`-free heuristic: an entry is a rollback if `release.version` sorts below `status.currentVersion` — reuse the existing version compare already in preload if present, otherwise compare the `AvailableRelease.version` string against `status.currentVersion` with a small inline 3-segment compare mirroring `version-catalog`'s (keep it tiny; duplication across the main/preload boundary is acceptable here and already common in this file).
5. On selecting an entry: `const confirmed = window.confirm(text)` where `text` for a rollback is
   `zh`: `将降级到 ${v}（当前 ${current}）。降级不会迁移新版本写入的数据，可能导致配置不兼容。确定继续？`
   `en`: `This downgrades to ${v} (currently ${current}). A downgrade does not migrate data written by newer versions and may be config-incompatible. Continue?`
   and for an upgrade a plain `zh`: `将安装 ${v}，确定继续？` / `en`: `Install ${v}?`
6. If confirmed: `await ipcRenderer.invoke('updates:install-version', release.version)` (same `.catch` logging pattern as the `updates:download` invoke).

Match the existing DOM-building helpers in the file (element creation, class names, how `skipButton` is attached) rather than inventing new structure.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/update-ui.test.ts test/update-skip.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/preload/update-view.ts src/preload/index.ts test/update-ui.test.ts
git commit -m "feat(update): version picker and downgrade confirmation in the update card"
```

---

## Task 5: `build-version-index.mjs`

**Files:**
- Create: `scripts/build-version-index.mjs`
- Test: `test/build-version-index.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function buildVersionIndex(archiveDirNames: string[]): { generatedAt: string; versions: Array<{ version: string; tag: string; archiveUrl: string }> }`
  - CLI: `node scripts/build-version-index.mjs <names-json-file> <out-file>` — reads a JSON string array of directory names, writes the index JSON to `<out-file>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/build-version-index.test.ts
import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { buildVersionIndex } from '../scripts/build-version-index.mjs'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })))
})

describe('buildVersionIndex', () => {
  it('drops non-semver names and sorts descending', () => {
    const index = buildVersionIndex(['1.2.0', 'latest', '1.10.0', 'nightly', '1.2.10'])
    expect(index.versions.map((v) => v.version)).toEqual(['1.10.0', '1.2.10', '1.2.0'])
  })

  it('derives tag and archiveUrl for each entry', () => {
    const [entry] = buildVersionIndex(['3.4.5']).versions
    expect(entry).toEqual({
      version: '3.4.5',
      tag: 'v3.4.5',
      archiveUrl: 'https://dshdesktop.com/updates/archive/3.4.5/'
    })
  })

  it('writes the index file from the CLI', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-version-index-'))
    roots.push(root)
    const namesFile = path.join(root, 'names.json')
    const outFile = path.join(root, 'versions.json')
    await writeFile(namesFile, JSON.stringify(['1.0.0', '1.1.0']), 'utf8')
    await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'build-version-index.mjs'),
      namesFile,
      outFile
    ])
    const written = JSON.parse(await readFile(outFile, 'utf8'))
    expect(written.versions.map((v: { version: string }) => v.version)).toEqual(['1.1.0', '1.0.0'])
    expect(typeof written.generatedAt).toBe('string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/build-version-index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/build-version-index.mjs
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

export function buildVersionIndex(archiveDirNames) {
  const versions = [...new Set(archiveDirNames)]
    .filter((name) => SEMVER.test(name))
    .sort((a, b) => compare(b, a))
    .map((version) => ({
      version,
      tag: `v${version}`,
      archiveUrl: `https://dshdesktop.com/updates/archive/${version}/`
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
  await writeFile(outFile, `${JSON.stringify(buildVersionIndex(names), null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outFile} with ${buildVersionIndex(names).versions.length} versions.`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/build-version-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-version-index.mjs test/build-version-index.test.ts
git commit -m "feat(release): version index generator for rollback catalog"
```

---

## Task 6: `release.yml` — prerelease parity

**Files:**
- Modify: `.github/workflows/release.yml`
- Test: `test/release.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: a workflow where a `prerelease_tag` `workflow_dispatch` input drives all three build jobs through the production package+sign+notarize path and a new `publish-prerelease` job.

- [ ] **Step 1: Write the failing test** (append to `test/release.test.ts`)

```ts
import { readFile as readWorkflow } from 'node:fs/promises'

describe('prerelease parity workflow', () => {
  const load = () =>
    readWorkflow(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')

  it('replaces the windows-only prerelease input with a general one', async () => {
    const yml = await load()
    expect(yml).toContain('prerelease_tag:')
    expect(yml).not.toContain('windows_prerelease_tag')
    expect(yml).not.toContain('Publish validated Windows development pre-release')
  })

  it('gates signing and both publish jobs so prerelease and release never overlap', async () => {
    const yml = await load()
    expect(yml).toContain('publish-prerelease:')
    // publish only runs for a real tag with no prerelease input
    expect(yml).toMatch(/publish:[\s\S]*inputs\.prerelease_tag == ''/)
    // publish-prerelease only runs when the input is set
    expect(yml).toMatch(/publish-prerelease:[\s\S]*inputs\.prerelease_tag != ''/)
    // sign-windows accepts the prerelease branch
    expect(yml).toMatch(/sign-windows:[\s\S]*inputs\.prerelease_tag != ''/)
  })

  it('mirrors a prerelease to an isolated ModelScope directory and never to latest', async () => {
    const yml = await load()
    expect(yml).toContain('releases/prerelease/')
  })

  it('parametrises the Windows smoke test executable', async () => {
    const yml = await load()
    expect(yml).toContain('SMOKE_EXE')
    expect(yml).toContain('SMOKE_USERDATA')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/release.test.ts`
Expected: FAIL on the new `describe`.

- [ ] **Step 3: Edit the workflow**

3a. **Input** — replace the `windows_prerelease_tag` block under `workflow_dispatch.inputs`:

```yaml
      prerelease_tag:
        description: Non-v semver tag for a production-parity pre-release (e.g. 2.1.0-rc.1)
        required: false
        type: string
```

3b. **`macos-apple-silicon` + `macos-intel`** — for each:
- job `if`: add `|| (github.event_name == 'workflow_dispatch' && inputs.prerelease_tag != '')`
- "Set app version from release tag" step: keep as-is, then add a sibling step:
  ```yaml
      - name: Set app version from pre-release tag
        if: github.event_name == 'workflow_dispatch' && inputs.prerelease_tag != ''
        run: npm version --no-git-tag-version --allow-same-version "${{ inputs.prerelease_tag }}"
  ```
- Every step currently `if: startsWith(github.ref, 'refs/tags/v')` (secret validation, notarization key, signing keychain, **Build signed … package**, preserve metadata, sign/notarize/staple DMG, remove keychain, verify app, `upload-artifact` for the signed bundle): change the condition to
  `if: startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != ''`
  (for the `always()` cleanup step: `if: always() && (startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != '')`)
- The two dev-build steps and the `*-dev` upload currently `if: ${{ !startsWith(github.ref, 'refs/tags/v') }}`: change to
  `if: ${{ !startsWith(github.ref, 'refs/tags/v') && inputs.prerelease_tag == '' }}`

3c. **`windows-x64`**:
- job `if`: simplify the `workflow_dispatch` clause so it also fires for `prerelease_tag`:
  ```yaml
    if: >-
      startsWith(github.ref, 'refs/tags/v') ||
      github.event_name == 'pull_request' ||
      (github.event_name == 'workflow_dispatch' &&
        (inputs.target == 'all' || inputs.target == 'windows' || inputs.prerelease_tag != ''))
  ```
- Add the "Set app version from pre-release tag" step (same as 3b).
- "Build Windows release package" step: `if: startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != ''`
- "Build isolated Windows development package" step: `if: ${{ !startsWith(github.ref, 'refs/tags/v') && inputs.prerelease_tag == '' }}`
- "Smoke test packaged Windows Harness" step:
  - condition: `if: github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'`
  - add `env:` at the step:
    ```yaml
        env:
          SMOKE_EXE: ${{ (startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != '') && 'dist\win-unpacked\DSH Desktop.exe' || 'dist-dev\win-unpacked\DSH Desktop Dev.exe' }}
          SMOKE_USERDATA: ${{ (startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != '') && 'dsh-desktop' || 'dsh-desktop-dev' }}
    ```
  - in the script body replace `$userData = Join-Path $env:APPDATA 'dsh-desktop-dev'` with `$userData = Join-Path $env:APPDATA $env:SMOKE_USERDATA` and `$executable = 'dist-dev\win-unpacked\DSH Desktop Dev.exe'` with `$executable = $env:SMOKE_EXE`. Leave every other line unchanged.
- **Delete** the entire "Publish validated Windows development pre-release" step.
- `windows-x64-unsigned` upload: `if: startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != ''`
- `windows-x64-dev` upload: `if: ${{ !startsWith(github.ref, 'refs/tags/v') && inputs.prerelease_tag == '' }}`

3d. **`sign-windows`** `if`:

```yaml
    if: >-
      always() &&
      (startsWith(github.ref, 'refs/tags/v') || inputs.prerelease_tag != '') &&
      needs.windows-x64.result == 'success'
```

3e. **`publish`** `if` — add the prerelease exclusion:

```yaml
    if: >-
      always() &&
      startsWith(github.ref, 'refs/tags/v') &&
      inputs.prerelease_tag == '' &&
      needs.macos-apple-silicon.result == 'success' &&
      needs.macos-intel.result == 'success' &&
      needs.sign-windows.result == 'success'
```

3f. **New `publish-prerelease` job** — insert after `publish`:

```yaml
  publish-prerelease:
    name: Publish GitHub Pre-release
    if: >-
      always() &&
      github.event_name == 'workflow_dispatch' &&
      inputs.prerelease_tag != '' &&
      needs.macos-apple-silicon.result == 'success' &&
      needs.macos-intel.result == 'success' &&
      needs.sign-windows.result == 'success'
    needs:
      - macos-apple-silicon
      - macos-intel
      - sign-windows
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci --ignore-scripts
      - uses: actions/download-artifact@v4
        with:
          pattern: macos-*
          path: release-assets
          merge-multiple: true
      - uses: actions/download-artifact@v4
        with:
          name: windows-x64
          path: release-assets
      - name: Merge macOS update metadata
        run: |
          set -euo pipefail
          node scripts/merge-mac-update-metadata.mjs \
            release-assets/latest-mac-arm64.yml \
            release-assets/latest-mac-x64.yml \
            release-assets/latest-mac.yml
          find release-assets -maxdepth 1 \
            \( -name latest-mac-arm64.yml -o -name latest-mac-x64.yml \) \
            -delete
      - name: Verify release assets before publication
        run: node scripts/verify-release-assets.mjs release-assets "${{ inputs.prerelease_tag }}"
      - name: Create or update pre-release
        env:
          GH_TOKEN: ${{ github.token }}
          RELEASE_TAG: ${{ inputs.prerelease_tag }}
        run: |
          if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
            gh release upload "$RELEASE_TAG" release-assets/* --clobber --repo "$GITHUB_REPOSITORY"
          else
            gh release create "$RELEASE_TAG" release-assets/* \
              --prerelease \
              --target "$GITHUB_SHA" \
              --generate-notes \
              --title "DSH Desktop $RELEASE_TAG（预发布）" \
              --repo "$GITHUB_REPOSITORY"
          fi
      - name: Mirror pre-release assets to ModelScope
        env:
          MODELSCOPE_TOKEN: ${{ secrets.MODELSCOPE_TOKEN }}
          MODELSCOPE_REPO_ID: alexyaojin/dsh-desktop
          PRERELEASE_TAG: ${{ inputs.prerelease_tag }}
        run: |
          set -euo pipefail
          test -n "$MODELSCOPE_TOKEN" || { echo "::error::Missing secret MODELSCOPE_TOKEN"; exit 1; }
          python3 -m venv "$RUNNER_TEMP/ms-env"
          "$RUNNER_TEMP/ms-env/bin/pip" install -q modelscope
          "$RUNNER_TEMP/ms-env/bin/python3" <<'PY'
          import os, pathlib
          from modelscope.hub.api import HubApi

          api = HubApi()
          token = os.environ["MODELSCOPE_TOKEN"]
          repo_id = os.environ["MODELSCOPE_REPO_ID"]
          tag = os.environ["PRERELEASE_TAG"]
          src = pathlib.Path("release-assets")

          api.upload_folder(
              repo_id=repo_id,
              folder_path=str(src),
              path_in_repo=f"releases/prerelease/{tag}",
              commit_message=f"Pre-release {tag}",
              token=token,
          )
          print(f"✅ Uploaded {src} -> {repo_id}/releases/prerelease/{tag}")
          PY
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/release.test.ts && npm run typecheck`
Expected: PASS. Also eyeball the YAML with `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml'))"` — expect no output (valid).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml test/release.test.ts
git commit -m "ci: production-parity pre-releases via prerelease_tag input"
```

---

## Task 7: `release.yml` — archive copy + version index on release

**Files:**
- Modify: `.github/workflows/release.yml` (the `publish` job)
- Test: `test/release.test.ts`

**Interfaces:**
- Consumes: `scripts/build-version-index.mjs` (Task 5).
- Produces: every `v*` release also lands in `releases/archive/<version>/` on ModelScope, and `releases/versions.json` is rebuilt from the archive listing.

- [ ] **Step 1: Write the failing test** (append to `test/release.test.ts`)

```ts
describe('rollback catalog publication', () => {
  it('archives each release and rebuilds the version index', async () => {
    const yml = await readFile(
      path.join(projectRoot, '.github/workflows/release.yml'),
      'utf8'
    )
    expect(yml).toContain('releases/archive/')
    expect(yml).toContain('scripts/build-version-index.mjs')
    expect(yml).toContain('releases/versions.json')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/release.test.ts`
Expected: FAIL on the new case.

- [ ] **Step 3: Edit the `publish` job**

Replace the single "Mirror release assets to ModelScope" step's Python heredoc so it also uploads the archive copy and rebuilds the index. Keep the existing `releases/latest` upload; add below it, inside the same `python3` block:

```python
          version = tag[1:] if tag.startswith("v") else tag
          api.upload_folder(
              repo_id=repo_id,
              folder_path=str(src),
              path_in_repo=f"releases/archive/{version}",
              commit_message=f"Archive {tag}",
              token=token,
          )
          print(f"✅ Archived {src} -> {repo_id}/releases/archive/{version}")

          from modelscope.hub.api import HubApi as _Api  # already imported; listing below
          entries = api.get_model_files(model_id=repo_id, root="releases/archive", recursive=False)
          names = [
              e["Name"].split("/")[-1]
              for e in entries
              if e.get("Type") == "tree" or e.get("Path", "").count("/") == 2
          ]
          import json, subprocess, tempfile
          with tempfile.TemporaryDirectory() as td:
              nf = pathlib.Path(td) / "names.json"
              of = pathlib.Path(td) / "versions.json"
              nf.write_text(json.dumps(names))
              subprocess.run(
                  ["node", "scripts/build-version-index.mjs", str(nf), str(of)],
                  check=True,
              )
              api.upload_file(
                  path_or_fileobj=str(of),
                  path_in_repo="releases/versions.json",
                  repo_id=repo_id,
                  commit_message=f"Version index after {tag}",
                  token=token,
              )
          print("✅ Rebuilt releases/versions.json")
```

**Note for the implementer:** the exact ModelScope listing call (`get_model_files` args / response shape) and `upload_file` signature must be verified against the installed `modelscope` version during implementation — adjust the field access (`Name`/`Path`/`Type`) to the real response. The `build-version-index.mjs` contract (JSON array of names in, index JSON out) is fixed; only the listing glue may change. If `get_model_files` cannot list directories in the installed version, fall back to deriving `names` from the archive folder just uploaded plus a fetch of the current `versions.json` via the public 302 URL (`curl -sL https://dshdesktop.com/updates/versions.json`), merged and de-duped before calling the script.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/release.test.ts && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"`
Expected: test PASS; YAML valid (no output).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml test/release.test.ts
git commit -m "ci: archive each release and rebuild the rollback version index"
```

---

## Task 8: Full-suite verification + runbook note

**Files:**
- Modify: `docs/superpowers/specs/2026-08-31-versioned-update-and-prerelease-parity-design.md` (append a "Deployment runbook" section) — or create `docs/update-rollback-runbook.md` if the repo prefers standalone runbooks (check `docs/` for precedent).

- [ ] **Step 1: Run the whole suite**

Run: `npm test && npm run typecheck`
Expected: all green. If any pre-existing unrelated failure appears, note it but do not fix it here.

- [ ] **Step 2: Write the runbook section**

Document, with the real values discovered during Task 7:
- The nginx `location` blocks required (`/updates/archive/(?<ver>...)/(?<file>...)`, `= /updates/versions.json`, optional `/updates/prerelease/...`) and the ModelScope `resolve` base they 302 to.
- How to trigger a prerelease: `workflow_dispatch` with `prerelease_tag = <semver>` (non-`v`).
- One-time backfill (optional): to make an existing older version a rollback target, upload its assets to `releases/archive/<version>/` on ModelScope and re-run the index step (or run `build-version-index.mjs` locally against the full name list and `upload_file` the result).
- Confirm `dshdesktop.com/updates/versions.json` and `dshdesktop.com/updates/archive/<v>/latest-mac.yml` resolve before announcing the feature.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: rollback + prerelease deployment runbook"
```

---

## Self-Review

**Spec coverage:**
- Prerelease input rename + `isRelease` gating → Task 6. ✓
- Smoke-test parametrization, keep as gate → Task 6 (3c). ✓
- `sign-windows` prerelease gate → Task 6 (3d). ✓
- Remove inline prerelease publish step → Task 6 (3c). ✓
- `publish-prerelease` job (prerelease flag, isolated ModelScope dir, no latest, no Feishu) → Task 6 (3f). ✓
- `publish` mutual exclusion → Task 6 (3e). ✓
- Archive copy per release → Task 7. ✓
- `versions.json` by listing `archive/` → Task 5 + Task 7. ✓
- nginx requirements documented → Task 8. ✓
- `version-catalog.ts` (constants, compareVersions, parseVersionIndex, fetchAvailableReleases) → Task 1. ✓
- `UpdateStatus.downgrade`, `AvailableRelease`, IPC channels → Task 2 + Task 3. ✓
- `installSpecificVersion` (feed swap + allowDowngrade + finally restore + auto-download on match) → Task 3. ✓
- `configureUpdater` sets `allowDowngrade = false` (residual-risk mitigation) → Task 3. ✓
- One-time install semantics (no pinning) → inherent: feed restored, `allowDowngrade` reset, no persisted state. ✓
- UI "install another version" + grouped list + downgrade confirm → Task 4. ✓
- `update-view` downgrade copy → Task 4. ✓
- All tests from spec's component 5 table → Tasks 1–7. ✓ (`verify-release-assets.test.mjs` row dropped: its regex `^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$` already accepts `2.1.0-rc.1`; no change needed.)

**Placeholder scan:** The two "verify against installed `modelscope` version" notes in Task 7 are deliberate — the ModelScope Python API surface cannot be pinned from this repo and the fallback path is fully specified. Everything else has concrete code.

**Type consistency:**
- `AvailableRelease { version; tag; archiveUrl }` — identical in Task 1, Task 2, Task 5 output, Task 6/7 index shape. ✓
- `installSpecificVersion(version: unknown): Promise<UpdateStatus>` — Task 3 interface and IPC handler match. ✓
- `compareVersions` return `-1 | 0 | 1` — Task 1; preload uses its own inline mini-compare (Task 4) by design, noted. ✓
- `buildVersionIndex(archiveDirNames: string[])` → `{ generatedAt, versions }` — Task 5 definition, Task 7 CLI usage match. ✓
- Feed swap string `setFeedURL({ provider: 'generic', url: STABLE_FEED_URL })` — Task 3 code and Task 3 test assertion match exactly (mind the escaped quotes in the test). ✓
