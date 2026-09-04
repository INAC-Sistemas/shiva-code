import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import { afterAll, describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const releaseWorkflow = path.resolve(projectRoot, '../.github/workflows/desktop-release.yml')

/**
 * The release workflow's version resolution, run as the shell script it is.
 *
 * String assertions cannot catch what this step actually gets wrong — the first
 * release failed because `grep` exits 1 on an empty tag list and `pipefail`
 * turns that into a dead step. So the script is extracted from the workflow and
 * executed against a real repository.
 */
async function resolveScript(): Promise<string> {
  const workflow = parse(await readFile(releaseWorkflow, 'utf8')) as {
    jobs: Record<string, { steps: Array<{ id?: string; run?: string }> }>
  }
  const step = workflow.jobs['resolve-version']?.steps.find((s) => s.id === 'resolve')
  if (!step?.run) throw new Error('resolve-version has no step with id "resolve"')
  return step.run
}

const roots: string[] = []

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
})

/** A repository with a remote, a package.json version, and the given tags. */
async function repository(version: string, tags: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-resolve-'))
  roots.push(root)
  const work = path.join(root, 'work')
  const origin = path.join(root, 'origin.git')
  const git = (...args: string[]) => execFileSync('git', args, { cwd: work, stdio: 'pipe' })

  execFileSync('git', ['init', '--quiet', '--bare', origin], { stdio: 'pipe' })
  execFileSync('git', ['init', '--quiet', work], { stdio: 'pipe' })
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  await writeFile(path.join(work, 'package.json'), JSON.stringify({ version }))
  git('add', '.')
  git('commit', '--quiet', '-m', 'init')
  git('remote', 'add', 'origin', origin)
  git('push', '--quiet', 'origin', 'HEAD:refs/heads/main')
  for (const tag of tags) {
    git('tag', tag)
    git('push', '--quiet', 'origin', tag)
  }
  return work
}

interface Resolved {
  version?: string
  tag?: string
  publish?: string
  prerelease?: string
  windows_artifact?: string
}

async function resolve(
  work: string,
  env: Record<string, string> = {}
): Promise<Resolved> {
  const outputFile = path.join(work, 'github-output')
  await writeFile(outputFile, '')
  execFileSync('bash', ['-c', await resolveScript()], {
    cwd: work,
    stdio: 'pipe',
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputFile,
      EVENT: 'push',
      DISPATCH_VERSION: '',
      PRERELEASE_TAG: '',
      WINDOWS_SIGNING: '',
      ...env
    }
  })
  return Object.fromEntries(
    (await readFile(outputFile, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
}

// The step under test runs on ubuntu-24.04 and is POSIX shell throughout, so
// there is no Windows behaviour to cover — only Git Bash's path handling to
// trip over. The suite also runs on the Windows packaging runner, where that
// would block a release for no signal.
describe.skipIf(process.platform === 'win32')('resolve-version', () => {
  it('seeds the sequence from package.json when no release tag exists', async () => {
    const work = await repository('0.1.1', [])
    expect(await resolve(work)).toMatchObject({
      version: '0.1.1',
      tag: 'shiva-desktop-v0.1.1',
      publish: 'true',
      prerelease: 'false'
    })
  })

  it('increments the patch digit once the version has been released', async () => {
    const work = await repository('0.1.1', ['shiva-desktop-v0.1.1'])
    expect(await resolve(work)).toMatchObject({ version: '0.1.2', publish: 'true' })
  })

  it('orders patch digits numerically rather than lexically', async () => {
    const work = await repository('0.1.1', [
      'shiva-desktop-v0.1.2',
      'shiva-desktop-v0.1.9',
      'shiva-desktop-v0.1.10'
    ])
    expect(await resolve(work)).toMatchObject({ version: '0.1.11' })
  })

  it('takes package.json as the minor and major knob', async () => {
    const work = await repository('0.2.0', ['shiva-desktop-v0.1.9'])
    expect(await resolve(work)).toMatchObject({ version: '0.2.0' })
  })

  it('ignores harness tags and prereleases when finding the highest release', async () => {
    const work = await repository('0.1.1', [
      'shiva-desktop-v0.1.1',
      'shiva-desktop-v9.9.9-rc.1',
      'dsh-v9.9.9',
      'desktop-preview-20260817.1'
    ])
    expect(await resolve(work)).toMatchObject({ version: '0.1.2' })
  })

  it('builds without publishing outside a push', async () => {
    const work = await repository('0.1.1', [])
    const resolved = await resolve(work, { EVENT: 'pull_request' })
    expect(resolved).toMatchObject({ publish: 'false', version: '' })
    expect(resolved.tag).toBeUndefined()
  })

  it('tags a pre-release with a bare semver and marks it as one', async () => {
    const work = await repository('0.1.1', [])
    expect(
      await resolve(work, { EVENT: 'workflow_dispatch', PRERELEASE_TAG: '0.2.0-rc.1' })
    ).toMatchObject({ version: '0.2.0-rc.1', tag: '0.2.0-rc.1', prerelease: 'true' })
  })

  it('re-cuts an exact version on dispatch', async () => {
    const work = await repository('0.1.1', ['shiva-desktop-v0.1.1'])
    expect(
      await resolve(work, { EVENT: 'workflow_dispatch', DISPATCH_VERSION: 'v0.5.0' })
    ).toMatchObject({ version: '0.5.0', tag: 'shiva-desktop-v0.5.0' })
  })

  it('refuses to republish a version that already has a tag', async () => {
    const work = await repository('0.1.1', ['shiva-desktop-v0.9.0'])
    await expect(
      resolve(work, { EVENT: 'workflow_dispatch', DISPATCH_VERSION: '0.9.0' })
    ).rejects.toThrow()
  })

  it('names the artifact the signing flag decides', async () => {
    const work = await repository('0.1.1', [])
    expect(await resolve(work)).toMatchObject({
      windows_artifact: 'windows-x64-unsigned'
    })
    expect(await resolve(work, { WINDOWS_SIGNING: 'true' })).toMatchObject({
      windows_artifact: 'windows-x64'
    })
  })
})
