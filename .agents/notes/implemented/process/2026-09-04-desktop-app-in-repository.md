# Agent Note: The desktop app lives in this repository

Status: implemented

English | [中文](2026-09-04-desktop-app-in-repository.zh.md)

## Problem

The Electron app shipped from a separate repository, `INAC-Sistemas/dsh-desktop`. It consumes the harness only as build output: 243 `@deepseek-ai/dsh-*` tarballs and 16 in-tree plugin tarballs, all referenced as `file:` dependencies under `desktop/packages/harness-<version>/`. Every harness or plugin change the app needed therefore travelled as a pack-and-copy step across a repository boundary, and a change that spanned both trees could not be reviewed, tested, or reverted as one unit.

## Decision

`desktop/` holds the Electron app, imported with `git subtree add` so its 373 commits stay reachable. It remains a standalone npm project with its own `package-lock.json` and `.npmrc`: no glob in `pnpm-workspace.yaml` matches `desktop/`, so a root `pnpm install` does not treat it as a workspace member, and its dependencies are still installed with `npm ci` from `desktop/`.

The tarball snapshot under `desktop/packages/harness-<version>/` is unchanged. Deleting it would break the 259 `file:` dependencies that `desktop/package.json` declares, so the app still consumes the harness as published output rather than from workspace sources.

### Continuous integration

GitHub reads `.github/workflows/` only at the repository root, so the two desktop workflows live there as `desktop-release.yml` and `desktop-backfill-archive.yml`. Both set `defaults.run.working-directory: desktop`; action inputs resolve against the workspace root instead and carry the prefix explicitly, so artifact paths, `download-artifact` destinations, and `cache-dependency-path` name `desktop/`. The release workflow's pull-request trigger is scoped to `master` and to paths under `desktop/`.

A release is cut by pushing `shiva-desktop-v<semver>`, and the 26 tags the standalone repository carried are not imported. The prefix names the product, because this repository also releases the harness under `dsh-v*`. The semver after it is the published application version and keys the ModelScope rollback archive at `releases/archive/<semver>/`, so it continues the sequence already published; `package.json` holds a stale version that the workflow overwrites from the tag. Every user-facing string still renders `v<semver>`, so release titles and note headings read as they did.

Release notes are generated from the commit range between two release tags. That range now also spans harness commits, so `feishu_release_notes.py` limits its `git log` and `git diff` to the current directory, which the workflow sets to `desktop/`.

### Gates

Two repository gates scanned the new directory and rejected it. `rescope-vendor` and the bilingual pairing gate both exempt `desktop/`: the app consumes published tarballs whose peer ranges legitimately carry upstream names, and it translates its own READMEs under its own naming rather than through `.i18n.yaml` records. The [vendored rescope](2026-08-10-vendor-package-rescope.md) owns the rename these exemptions carve out of.

The desktop bundles the pnpm version it is tested against. Because pnpm 10 replaces itself with the version named by the nearest ancestor `packageManager` field, a profile command run from a checkout would have picked up the harness root's pnpm; the spawn environment now pins `manage-package-manager-versions` off.

## Alternatives considered

**Keep the app in its own repository.** This preserves independent release tagging and a smaller clone, but leaves every harness-plus-app change split across two review histories, which is the cost this import removes.

**Make `desktop/` a pnpm workspace member.** This is what would let the app build against `plugins/` and the harness sources instead of 259 tarballs, and it is the reason to be in one repository at all. It is deliberately not part of this import: reconciling npm `file:` tarball dependencies with pnpm resolution is a larger change, and doing it here would have mixed a mechanical import with a build-system rewrite.

**Delete the temporary tarball snapshot during the import.** Its own README marks it as temporary, pending an upstream npm publication that has not happened. Removing it breaks `npm ci`, and the blobs remain in history either way, so the tree stays as it is.

**Keep the desktop's bare `v*` tags and import them.** This costs no code change and does not collide, since the harness releases under `dsh-v*` and no other workflow here triggers on a tag. It was rejected because a bare `v*` does not say which of two released products a tag ships, and importing 26 tags under a convention being retired would leave two schemes in one listing.

## Consequences

One clone, one review history, and one revert unit cover the harness and the app. The repository pack grows by about 40 MB, and its tag namespace is now shared — `shiva-desktop-v*` belongs to the desktop, `dsh-v*` to the harness.

Discarding the old tags costs the first release its predecessor: `find_previous_tag` matches nothing, so that release's notes come from the last 100 commits instead of a tag range. Every release after it recovers the range. The one test that read this repository's real tag history is gone, having been skipped since the fork; the synthetic-history test beside it covers the same previous-tag resolution deterministically.

The self-hosted macOS runner that signs Windows installers is registered against the old repository and must be re-registered here before a release can complete. Branches left unmerged in `INAC-Sistemas/dsh-desktop` at the cut are not part of the import and have to be reapplied on top of `desktop/`.

## Testing

`npm test` in `desktop/` covers the app's 666 tests, including the release-workflow assertions that now read the root workflow path. `pnpm run hygiene` and `pnpm run test:docs` cover the two gate exemptions.
