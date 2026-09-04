# Agent Note: Desktop updates ship from this repository's GitHub Releases

Status: implemented

English | [中文](2026-09-04-desktop-updates-from-github-releases.zh.md)

## Problem

The desktop app already had a complete auto-update mechanism — `electron-updater`, a phase reducer, skip-a-version persistence, a rollback picker, and the preload-injected update card. It pointed at infrastructure we do not own. The feed was `https://dshdesktop.com/updates/`, the vendor's domain; the rollback archive was a ModelScope repository under a vendor account; release notification went to a vendor Feishu webhook. An installed build could never receive a version published here.

Publishing was also unreachable. A release required pushing a `shiva-desktop-v*` tag by hand, and the `publish` job additionally required the macOS notarization jobs and a `sign-windows` job that runs on a self-hosted macOS runner holding a SafeNet UKey. Neither the runner nor the six Apple secrets exist for this repository, so no tag could produce a release.

## Decision

Updates ship from GitHub Releases of `INAC-Sistemas/shiva-code`, and a push to `master` publishes one. Only the default branch releases, so a release is never cut from an integration branch by accident, and `workflow_dispatch` — the re-cut and pre-release paths — is offered in the Actions UI, which it is not for a workflow absent from the default branch.

This required moving the fork's `master` onto the product line. It had been left at the commit `rai` branched from while local checkouts fast-forwarded it to the upstream harness's own master, so it carried no desktop app; `origin/master` was a strict ancestor of `rai`, and the move was a fast-forward.

### The feed stays on the `generic` provider

The stable feed is `https://github.com/INAC-Sistemas/shiva-code/releases/latest/download/`, GitHub's permanent redirect to the latest release's assets. A rollback points the feed at `releases/download/shiva-desktop-v<semver>/`, and the rollback index is the `versions.json` asset of each release.

The `github` provider was rejected. `update-manager.ts` restores the stable feed with `setFeedURL({ provider: 'generic', … })` after installing a specific version, so a `github`-provider package would disagree with its own runtime feed. The `generic` provider also makes the per-version base a plain URL, which happens to contain the version — so `Provider.getBlockMapFiles` derives a correct old-blockmap URL for a rollback, which the version-less artifact name would otherwise prevent.

Every feed built from these URLs sets `useMultipleRangeRequest: false`. `electron-updater` enables multi-range downloads for any non-S3 URL, and GitHub's asset CDN answers a multi-range request with `501`. Without the opt-out, each update fetches two blockmaps and issues a failing range request before falling back to a full download. Single-range requests return `206`, so differential downloads still work.

**The feed depends on GitHub's notion of the latest release**, and this repository's tag namespace is shared with the harness (`dsh-v*`). Three things hold it: `publish` passes `--latest` explicitly rather than relying on the date heuristic, `publish-prerelease` never does, and `desktop/test/release.test.ts` fails if any other workflow starts creating GitHub Releases. Only `desktop-release.yml` creates them today.

### One job resolves the version

`resolve-version` runs first and publishes `version`, `tag`, `publish`, `prerelease`, and `windows_artifact`. The roughly thirty repetitions of `startsWith(github.ref, 'refs/tags/shiva-desktop-v') || inputs.prerelease_tag != ''` collapse into `needs.resolve-version.outputs.publish == 'true'`, and the three paired version steps collapse into one.

The version rule is `package.json` when it exceeds the highest `shiva-desktop-v*` tag, otherwise that tag with the patch digit incremented. CI owns the patch digit; `package.json` is the reviewed minor/major knob, and it seeds the sequence — no such tag existed when this landed, so "highest tag plus one" alone would have resolved to nothing. The job refuses to run if the tag it resolved already exists.

There is no tag trigger. `paths` on a `push` block filters tag pushes as well, and a tag placed on an already-pushed commit has a degenerate diff, so a tag trigger beside the branch path filter would silently swallow releases. `publish` creates the tag itself, at the point where the assets are ready; a tag pushed with `GITHUB_TOKEN` does not re-trigger workflows, so this cannot loop.

### Signing is preserved, not removed

`sign-windows` and both macOS jobs stay in the workflow in full, each gated on a repository variable — `DESKTOP_WINDOWS_SIGNING` and `DESKTOP_MACOS_RELEASE`. Turning either back on is a configuration change once the runner or the Apple secrets exist. `publish` treats a skipped signing or macOS job as acceptable and a failed one as blocking, and reads `windows_artifact` to consume the signed set when it exists. `finalize-windows-release.mjs`, which regenerates the blockmap and `latest.yml` after signing rewrites the installer, is untouched.

Only the vendor's own infrastructure was deleted: the ModelScope mirror, `desktop-backfill-archive.yml` (which existed solely to populate that mirror), and the Feishu webhook. `feishu_release_notes.py` itself survives — `github_release_notes.py` imports `collect_release_evidence`, `release_version`, and `LINK_PATTERN` from it — with only the `send` subcommand and the card formatting removed.

`verify-release-assets.mjs` now takes the platforms to verify. It required six macOS assets unconditionally, which a Windows-only release cannot satisfy.

## Alternatives considered

**Host the feed on the VPS that runs the plugin library.** This keeps the existing `generic` provider URL shape and gives full control over rollout and metrics. Rejected: the repository is public, so GitHub Releases needs no token, no server, no storage, and no upload step, and the CDN already serves range requests.

**A dedicated public repository for installers.** This removes the shared-tag-namespace hazard outright, since nothing else would ever be the latest release there. Rejected as premature: it needs a second repository and a cross-repository token, and it splits the release notes and tag history that [the desktop import](../process/2026-09-04-desktop-app-in-repository.md) had just consolidated. The `--latest` flag plus a guard test covers the hazard at far lower cost, and the escape hatch is recorded below.

**Commit the version bump back to the release branch from CI.** This would give `package.json` a single truthful value. Rejected: it needs a token that can push to a protected branch, a `GITHUB_TOKEN` push adds a commit that itself touches `desktop/` and would need excluding, and a PAT push re-triggers `on: push`, which is an infinite release loop. The tag is the source of truth instead.

**Delete the signing jobs and restore them from git history later.** Rejected on the user's instruction, and it is the better call regardless: keeping them means the existing `release.test.ts` assertions about Jsign, the UKey, and notarization keep guarding that code against bitrot while it is unused.

## Consequences

A push to `master` touching the desktop app ships a release, so version numbers advance with merges rather than with deliberate tagging. Doc, test, and Markdown-only paths are excluded from the trigger; anything else under `desktop/` publishes and shows an update card to every installed app within six hours.

Windows installers are unsigned until `DESKTOP_WINDOWS_SIGNING` is set, so SmartScreen warns about an unknown publisher on first install. Updates themselves are unaffected: `win.verifyUpdateCodeSignature` was already `false`.

The Windows smoke test now runs on release builds too. It previously skipped tag pushes, which meant the installer that reached users was the one that had never been launched in CI.

`desktop/package.json` continues to trail the published version between minor bumps. That was already true and is now the documented rule rather than an accident.

If a harness release ever needs to be published here, it must pass `--latest=false`. Should that become common, the escape hatch is a permanent `shiva-desktop-updates` release marked as a pre-release — so it can never be "latest" — holding only `latest.yml` and `versions.json`, with the installer named by an absolute URL, which `resolveFiles` honours over the base.

## Testing

`npm test` in `desktop/` covers the app's 669 tests, including the rewritten workflow assertions, the version-catalog URLs, the platform-scoped asset verification, and a new guard that no other workflow creates a GitHub Release. `npm run typecheck` covers the feed constants.

None of that proves an update reaches a user. The end-to-end proof is two consecutive releases installed on a Windows machine, using **Check for updates** to avoid the six-hour interval, then **Update now** and **Restart and install**, confirming the new version in the About box and confirming the logs carry no `multipart/byteranges` error.
