# dsh-prototype

A simple live browser for workspace prototypes: renders the workspace `prototype/` folder (HTML + CSS + JS + localStorage, relative links, real navigation) in a same-origin iframe inside a better-sidebar tab — and gives agents an automation bridge to click, fill, navigate, read, eval and take **full-screen screenshots** without playwright.

## Experience

1. No `prototype/` folder yet → the tab is just **Create prototype folder**.
2. Folder exists → file dropdown (every `.html`), URL line, reload, **Open** in VS Code, **Enable screen capture** (grant once), and a **Console** drawer streaming the page's `console.error/warn` + runtime errors.
3. Default page: `index.html` (else the first `.html`). Navigation inside the iframe is real — the served files keep relative links working.

## How it works

- **File server**: `GET /prototype/file/<token>/<path>` serves the folder with correct MIME; every `.html` response gets `<script src="/prototype/shim.js">` injected before `</body>`. The token is the workspace handle returned by `status`: a `GET` carries no JSON scope, so the workspace travels in the path, where the page's relative links keep it. Only workspaces the tab has reported resolve — anything else is `404`.
- **Shim** (injected): exposes click (selector or visible text), fill (native setter + input/change events), read, eval, wait_for and console_dump to the tab over `postMessage`; hooks `console.error/warn`, `window.onerror` and `unhandledrejection` (200-entry buffer).
- **Automation queue (host)**: one command in flight, 12 s TTL.
  - `POST /prototype/api/automation/submit` `{cmd:{op,...}}` → `{id}` (409 when busy)
  - `automation/pending` — the tab polls, forwards to the iframe (navigate + screenshot are resolved parent-side)
  - `automation/result` — tab posts the outcome; `dataUrl` screenshots are saved to `prototype/.shots/shot-<ts>.png`
  - `automation/wait` `{id, timeoutMs}` — long-poll for the result (≤ 10 s)
  - `automation/results`, `automation/console`, `automation/console_push`
- **Screenshots**: `getDisplayMedia` granted once from the tab; every agent screenshot then grabs a live frame of the whole screen (chat + prototype included) with no further prompts. Without the grant the command fails with a clear error.

## Agent flow (no browser library needed)

```text
automation/submit {cmd:{op:'navigate', path:'login.html'}}
automation/wait   {id}
automation/submit {cmd:{op:'fill', selector:'#email', value:'a@b.c'}}
automation/wait   {id}
automation/submit {cmd:{op:'click', text:'Entrar'}}
automation/wait   {id}
automation/submit {cmd:{op:'screenshot'}}
automation/wait   {id}   → data.saved = prototype/.shots/shot-....png
automation/console       → captured errors/warnings
```

Same-origin by design: prototypes are trusted local content, and that is what keeps relative links and localStorage working. Guard rails mirror dsh-mds: traversal rejected, per-segment name validation, `.git`/`node_modules` skipped, dot-folders (like `.shots/`) hidden from listings, 4 MiB cap.

MIT.
