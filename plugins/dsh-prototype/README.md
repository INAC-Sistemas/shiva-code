# dsh-prototype

A simple live browser for workspace prototypes: renders the workspace `prototype/` folder (HTML + CSS + JS + localStorage, relative links, real navigation) in a same-origin iframe inside a better-sidebar tab — and gives agents an automation bridge to click, fill, navigate, read, eval and take **full-screen screenshots** without playwright.

## Experience

1. No `prototype/` folder yet → the tab is just **Create prototype folder**.
2. Folder exists → file dropdown (every `.html`), URL line, reload, **Open** in VS Code, **Enable screen capture** (grant once), and a **Console** drawer streaming the page's `console.error/warn` + runtime errors.
3. Default page: `index.html` (else the first `.html`). Navigation inside the iframe is real — the served files keep relative links working.

## How it works

- **File server**: `GET /prototype/file/<token>/<path>` serves the folder with correct MIME; every `.html` response gets `<script src="/prototype/shim.js">` injected before `</body>`. The token is the workspace handle returned by `status`: a `GET` carries no JSON scope, so the workspace travels in the path, where the page's relative links keep it. Only workspaces the tab has reported resolve — anything else is `404`.
- **Shim** (injected): exposes click (selector or visible text), fill (native setter + input/change events), read, eval, wait_for and console_dump to the tab over `postMessage`; hooks `console.error/warn`, `window.onerror` and `unhandledrejection` (200-entry buffer). Its source of record is the plugin library (`plugin-manager/plugins/prototype/shim.ts`); this plugin fetches it, caches it for the process and serves it at `/prototype/shim.js`, so the page stays same-origin and a `<script src>` never needs a credential. The bundled copy answers when no endpoint is configured or the library is unreachable, and the log line names which one is in use.
- **Automation queue**: one command in flight, 12 s TTL.
  - `POST /prototype/api/automation/submit` `{cmd:{op,...}}` → `{id}` (409 when busy)
  - `automation/pending` — the tab polls, forwards to the iframe (navigate + screenshot are resolved parent-side)
  - `automation/result` — tab posts the outcome; `dataUrl` screenshots are written to `prototype/.shots/shot-<ts>.png` and named in `data.saved`
  - `automation/wait` `{id, timeoutMs}` — long-poll for the result (≤ 10 s)
  - `automation/results`, `automation/console`, `automation/console_push`
- **Screenshots**: `getDisplayMedia` granted once from the tab; every agent screenshot then grabs a live frame of the whole screen (chat + prototype included) with no further prompts. Without the grant the command fails with a clear error.

## Where the queue runs

`config.endpoint` decides it, once, at load — there is no runtime fallback between the two modes.

| | configured | absent |
|---|---|---|
| queue, console ring, screenshots | plugin library on the VPS | this process |
| survives a restart | yes | no |
| agent and browser on different machines | yes | no |
| needs a sign-in (dsh-login, same profile) | yes | no |

Every proxied call is authenticated as whoever signed in; with nobody signed in the API answers `401` with what to do about it, rather than asking the library anonymously. The workspace travels as its opaque token, so no local path leaves the machine, and the library indexes by (user, workspace) — two workspaces never see each other's queue.

What does **not** move, in either mode: the file server, the `prototype/` CRUD, the same-origin iframe, `getDisplayMedia` and `open` in the editor all need the user's own machine. A screenshot is written to `prototype/.shots/` on the way through even when the library stores it, because the agent reads the capture as a file; that local PNG is a cache, the library's copy is the durable one and `data.shot.url` points at it.

The API the tab and the agent call is identical either way — `/prototype/api/*` never moves.

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
                           data.shot.url = the durable copy, when the library is configured
automation/console       → captured errors/warnings
```

Same-origin by design: prototypes are trusted local content, and that is what keeps relative links and localStorage working. Guard rails mirror dsh-mds: traversal rejected, per-segment name validation, `.git`/`node_modules` skipped, dot-folders (like `.shots/`) hidden from listings, 4 MiB cap.

MIT.
