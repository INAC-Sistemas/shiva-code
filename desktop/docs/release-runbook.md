# Desktop release runbook

## Cutting a release

A push to `master` that touches the desktop app releases it. Only the default branch releases, so a release is never cut from an integration branch by accident. The `resolve-version` job picks the version, the Windows job builds and smoke-tests the installer, and the `publish` job creates the tag `shiva-desktop-v<semver>` and the GitHub Release in one step. Nothing has to be tagged by hand.

A pull request into `master` or `rai` builds the unsigned development installer and runs the packaged smoke test, so desktop changes are exercised before they merge; neither publishes.

Doc, test, and Markdown-only edits under `desktop/` are excluded from the trigger, so they do not push an update card to every installed app.

### Which version ships

```
highest = the largest shiva-desktop-v* tag, or 0.0.0 when none exists
next    = package.json version, when it is greater than highest
        = highest with the patch digit incremented, otherwise
```

CI owns the patch digit; `desktop/package.json` is the minor/major knob. To cut `0.2.0`, bump `package.json` to `0.2.0` in a reviewed commit and merge it. The same rule seeds the sequence when no release tag exists yet.

The committed `package.json` version therefore trails the published one between minor bumps. That is deliberate: the tag is the source of truth, and the workflow overwrites `package.json` from it at build time with `npm version --no-git-tag-version`, which rewrites `package-lock.json` to match.

`resolve-version` fails the run if the tag it resolved already exists. Never reuse a published tag; fix the problem and let the next push ship the next patch.

### Re-cutting and pre-releases

- **Re-cut a specific version**: dispatch the workflow with `version` set to an exact semver. This is the replacement for pushing a tag by hand.
- **Production-parity pre-release**: dispatch with `prerelease_tag` set to a bare semver such as `2.1.0-rc.1`. It publishes a GitHub pre-release, which GitHub excludes from the latest-release redirect, so installed apps never see it.

## The update feed

Installed apps read `https://github.com/INAC-Sistemas/shiva-code/releases/latest/download/latest.yml`, a permanent redirect to whichever release GitHub considers latest. The per-version rollback feed is `releases/download/shiva-desktop-v<semver>/`, and the rollback index is the `versions.json` asset published with each release.

**Hard rule: every other GitHub Release created in this repository must pass `--latest=false`.** This repository shares its tag namespace with the harness (`dsh-v*`). A release published without that flag becomes the latest release, and every installed desktop app would then look for `latest.yml` under that tag. Only `desktop-release.yml` creates releases today, and `desktop/test/release.test.ts` fails if another workflow starts.

Feeds built from these URLs must also set `useMultipleRangeRequest: false`. `electron-updater` enables multi-range downloads for any non-S3 URL, and GitHub's asset CDN answers a multi-range request with `501`, which costs a failed round trip before each update falls back to a full download. Single-range requests work, so differential downloads remain available.

## Diagnosing an update that did not happen

An automatic check is silent unless it finds a version: no card when it is up to date, and no card
when it fails. Use **Harness → Show Harness Log** and grep for `[updater]`.

| Line | Meaning |
|---|---|
| no `[updater]` line at all | The manager never armed — a development build, or an unpackaged one |
| `armed ... first check in Ns` | Scheduled; the delay is counted from when the Harness finished starting |
| `checking` then `up-to-date` | Working, nothing to offer |
| `checking` then `error - ...` | The check failed; the line names the cause |
| `error ENOENT ... app-update.yml` | The build was packaged without a publish config |

A manual check through the menu is the same request with `manual` in the line, and unlike an
automatic one it also shows its outcome on screen.

## Code signing

Signing is **not enabled**. Windows installers ship unsigned, so SmartScreen warns about an unknown publisher on first install. Updates are unaffected: `win.verifyUpdateCodeSignature` is `false`, and an installed build checks for, downloads, and installs new versions normally.

Both signing paths remain in `desktop-release.yml` in full, each behind a repository variable. Turning one on is a configuration change, not a workflow change.

### Windows: `vars.DESKTOP_WINDOWS_SIGNING`

Windows packaging and signing are separate jobs. The GitHub-hosted Windows runner builds an unsigned NSIS installer and uploads a short-lived artifact. A local macOS ARM64 runner downloads it, signs it with Jsign and the SafeNet UKey, regenerates the blockmap and `latest.yml` — signing rewrites the installer's bytes, so the metadata electron-builder produced no longer describes it — and uploads the signed set. `resolve-version` publishes which artifact the release consumes, so the publish jobs need no change either way.

To enable:

1. Register a runner with the `self-hosted`, `macOS`, and `ARM64` labels.
2. Install SafeNet Authentication Client and confirm `/usr/local/lib/libeTPkcs11.dylib` is readable.
3. Create the repository secret `DESKTOP_WINDOWS_SIGNING_PIN` holding the UKey PIN. For stronger controls, use an environment secret and add the matching `environment` to the `sign-windows` job.
4. Set the repository variable `DESKTOP_WINDOWS_SIGNING` to `true`.
5. Connect the UKey before the release runs.
6. Restrict workflow changes to trusted maintainers. A self-hosted runner can read any secret injected into its job. Signing never runs on `pull_request`, which is what keeps fork PRs away from it.

The workflow pins Jsign 7.5 by SHA-256 and uses the SafeNet `ETOKEN` store, SHA-256 signing, and a DigiCert RFC 3161 timestamp. GitHub injects the PIN only into the signing step, which copies it to a mode-`600` temporary file, removes it from the shell environment, and deletes the file when the step exits. The PIN is never printed or passed as a command-line argument.

Rehearse the first signed release with a `prerelease_tag` dispatch before letting one reach `master`. Afterwards, verify that the installer shows the expected publisher and a valid RFC 3161 timestamp in its Digital Signatures properties.

### macOS: `vars.DESKTOP_MACOS_RELEASE`

macOS packaging needs six Apple secrets — `DESKTOP_CSC_LINK`, `DESKTOP_CSC_KEY_PASSWORD`, `DESKTOP_APPLE_API_KEY`, `DESKTOP_APPLE_API_KEY_ID`, `DESKTOP_APPLE_API_ISSUER`, `DESKTOP_APPLE_TEAM_ID`. Create all six, then set `DESKTOP_MACOS_RELEASE` to `true`. The jobs sign, notarize, staple, and verify both architectures, and `publish` merges their update metadata into `latest-mac.yml` and verifies the macOS assets alongside the Windows ones.

While the variable is unset the jobs are skipped, and `publish` treats a skipped job as acceptable but a failed one as blocking.
