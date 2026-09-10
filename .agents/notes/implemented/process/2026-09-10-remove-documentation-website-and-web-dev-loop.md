# Agent Note: Remove the documentation website and the browser web-development loop

Status: implemented

English | [中文](2026-09-10-remove-documentation-website-and-web-dev-loop.zh.md)

## Problem

The repository carried a VitePress documentation site (`website/`) and a browser-oriented development loop (`scripts/dev-web.ts`) that no product surface consumes any more. This fork ships one application, the Electron desktop app, which launches `dsh web` on loopback and renders the harness Web GUI inside a `BrowserWindow`; nobody publishes the documentation site, and nobody develops against a plain browser. Both cost real maintenance: the site owned a projector, two fragment gates, a Pages workflow, a Windows CI lane, four `docs:*` scripts and a workspace member, and the watcher owned a model-visible prompt clause promising hot reload that only that watcher could deliver.

## Decision

**The documentation site is gone.** `website/`, `scripts/project-doc-site.ts`, `scripts/verify-doc-site-fragments.ts`, their specs, the `dsh-doc-site-sync` skill, and `.github/workflows/docs-pages.yml` are deleted. The `docs:dev`, `docs:build`, `docs:build:mpa`, `docs:preview`, `docs:check`, `website:dev`, `website:build` and `verify-doc-site-fragments` scripts are removed, along with the `website` workspace member and its `tsconfig.host.json`, `.oxlintrc.json` and `knip.json` entries. `doc-sync` loses the `docs-site-build` and `docs-site-projection` leaves; `docSyncLeafGates` loses its `docsBuildScript` option. `docs/` remains the documentation corpus, read from the repository — every other documentation gate (links, fragments, wrap, pairing, budgets, refs, catalogs) is unchanged and still enforces it.

**Windows CI keeps a blocking lane, not a site build.** `ci-windows-blocking` is now the build alone, `ci-windows-complete` no longer schedules a production site, and the `ci-master.yml` consolidated-runner benchmark's Windows workload is `build`. The lane existed to prove Windows could run a long native-heavy job; the build serves that purpose and the site no longer exists to serve it.

**The browser development loop is gone; the runtime it fed is not.** `scripts/dev-web.ts` and the `dev:web` script are deleted, and `apps/web/tests/hmr-live.e2e.ts`, which drove that watcher, with them. `@deepseek-ai/dsh-client-hmr` stays mounted in the `web-app` bundle: its node half stat-polls whatever rewrites `lib/client.js` and never depended on one specific watcher, so removing the repository's watcher leaves the chain idle rather than broken. The model-visible `app:web-surface` prompt no longer names `pnpm run dev:web`; it states the same contract in terms of "a separate watcher in this same checkout", which stays true for any rebuild process a developer runs.

**`apps/web`, `packages/client/*`, `packages/host/webserver` and `packages/bundle/web-app` are explicitly retained.** They are not "web development" in the sense removed here — they are the Electron renderer. `desktop/src/main/runtime/harness-runtime.ts` spawns `dsh web --no-open --host 127.0.0.1 --port <n>`, `desktop/src/main/index.ts` loads brand assets from `@deepseek-ai/dsh-web-frontend/dist`, and `@deepseek-ai/dsh-web-app` is a core bundle in the desktop's safe-mode and recovery profiles. Deleting them would leave the desktop app with no window content. The `test:web*` lanes are retained for the same reason: they are the only automated coverage of the renderer the desktop ships.

**Site-only Agent Notes are archived, not rewritten.** Seven implemented triplets whose decisions no longer describe anything in the tree — site projection, navigation and chrome, raw-Markdown twins, tag release, site images, published document fragments, and the quick-start locale redirect — move to `archived/` with the standard `Archived:` stamp and manifest seal. Inbound links from still-active notes are repaired: the browser-GIF note now cites the archived image decision by its frozen path, and the product-first README note drops a claim about a site that no longer exists. Two Chinese archived sides needed their full-width `Agent Note：` title colon normalized to ASCII, because `verify-agent-note-format` only inspects English sides while the archive validator checks both — a latent divergence this archival surfaced.

**`docs/user/index.md` becomes a real index.** It previously held nothing but VitePress redirect frontmatter and a heading, which is meaningless without a site; both language sides now list the guides under `docs/user/`.

## Verification

`scripts/run-gates.spec.ts` pins the new `doc-sync` leaf order and the Windows observational filter, and passes. `packages/bundle/web-app/tests/web-app.spec.ts` asserts the rewritten update-contract sentence in the `app:web-surface` section, and both `apps/web` prompt snapshots (`web-runtime-context`, `fresh-round-trip`) carry the same text, so the model-visible change is pinned in the assembled transcript as well as the unit test. `verify-md-links`, `verify-doc-refs`, `verify-agent-note-format`, `verify-agent-note-classification` and `verify-archived-agent-notes` pass over the whole corpus. `verify-translation-pairing` reports only violations that predate this change on this branch (in-tree `plugins/*` READMEs, `plugin-manager/`, `docs/subsystems/skills.md`, `packages/client/ui-sidebar`), confirmed by running the gate against a stashed clean tree.

## Alternatives considered

- **Remove `dsh web` and the whole web runtime too.** This is what a literal reading of "remove web development" asks for, and it destroys the product: the Electron app has no renderer of its own. Reaching it would require first teaching `desktop/` to serve and host the client itself — a rewrite, not a removal, and one the request explicitly did not ask for since Electron development and production must keep working.
- **Keep `website/` unbuilt, just drop it from CI.** Rejected: an unbuilt projector rots silently, and the pre-release stance in `AGENTS.md` prefers deleting a surface outright over carrying a dormant one.
- **Remove `packages/client/hmr` along with its watcher.** Rejected as out of scope: the receiver is a runtime row in the `web-app` bundle that the desktop composition loads, so removing it changes what Electron ships, and the chain works with any process that rewrites client bundles rather than with one repository script.
- **Delete the site Agent Notes instead of archiving them.** Rejected: the notes README permits deletion only through consolidation into an owning note that preserves every unique rationale. Archiving is the sanctioned move for a complete decision whose rationale no longer guides work, and it also takes the notes out of the link gates' source set.

## Consequences

Documentation is now read from the repository only; there is no published site, no `llms.txt`, and no rendered-HTML fragment check, so heading anchors are guaranteed by `verify-md-links` against GitHub slugs alone. Anyone who wants the site back restores the archived projection note as a starting point, but must rebuild the projector — it is not recoverable from a config flag. Client-plugin hot reload keeps working for anyone who runs their own rebuild watcher, and stops being a documented repository workflow. Windows CI no longer exercises a VitePress build, which was its longest single job. The only web development this repository still hosts is `plugin-manager/`, which is a standalone Next.js project outside the pnpm workspace and untouched by this change.
