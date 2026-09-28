# Agent Note: Full-scope browser automation granted by default

Status: implemented

## Problem

`/07-build` makes the principal agent prove each ticket by walking the running application: sign in, click, fill, read the DOM and the console. Only the `browser` tool's `scope: "full"` can do that, and until now it ran only when the harness `settings.yaml` carried a top-level `browserFullAccess: true`. A fresh desktop install has no such line, so the first ticket of every epic stopped at the acceptance step and the agent had to ask the owner to edit a file under `%APPDATA%\dsh-desktop\harness`. The dsh-browser README and `/00-start-here` still said the agent could not click or read a visited page at all, so the model had no reason to try full scope.

## Decision

`dsh-browser` 0.3.0 inverts the gate: full scope is granted unless `settings.yaml` carries a top-level `browserFullAccess: false`. A missing `DSH_HOME` or an absent or unreadable `settings.yaml` keeps the grant. The file is still read on every call, so revoking applies without a restart, and there is still no per-session approval. The tool description, the `scope` parameter text and the refusal message state the new default and the way to revoke it. The README documents both scopes and the full-scope ops; `/00-start-here` tells the model that full scope is how `/07-build` walks the app, and `/08-review` names the revocation line as the only thing that disables it.

Since 0.3.1 a page-automation op called without `scope` runs in full scope, and the error for an explicit `scope:"workspace"` no longer quotes the revocation message: in 0.3.0 an omitted scope was refused with the `browserFullAccess: false` text, and the model read that as access being off and stopped walking the app. Since 0.3.2 `open` and `navigate` to an http(s) URL without `scope` also load the real page, because the workspace scope's sandboxed iframe has an opaque origin where a dev server's app (service worker, storage) rendered blank. Hiding the Browser tab still drops the real page view, and showing the tab again loads the same URL; the address bar, the reload button and a scope-less screenshot use the real page while one is shown. The desktop tarball is `dsh-browser-0.3.2.tgz`, with its lockfile integrity computed from the packed bytes.

## Alternatives considered

**Keep the opt-in and ask for the flag at the start of `/07-build`.** Rejected by the product owner: every new install would still stop once, and the owner wants the acceptance flow to run without setup.

**Grant full scope only for `localhost` URLs.** Deferred: the same tool proves deploys against public URLs in `/08-review` and `/11-connections`, so a host allowlist needs its own configuration field and its own decision.

## Consequences

- By default an agent can script any URL rendered in the desktop's Browser tab, including pages where the desktop browser session is signed in. Owners who do not want that add `browserFullAccess: false` to the harness `settings.yaml`.
- Existing `browserFullAccess: true` lines keep working and are now redundant.
