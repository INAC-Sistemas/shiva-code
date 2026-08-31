# Agent Note: the prototype automation queue runs in the plugin library

Status: implemented

## Problem

`dsh-prototype` renders the workspace `prototype/` folder in a tab and lets an agent drive the live page — click, fill, read, screenshot — so the `03-prototype` skill can validate every screen with the requester before freezing the UX. All of it ran in the client process: the command queue was one slot and a `Map` of 50 results, the console was a 200-entry array, and screenshots were files under `prototype/.shots/`.

That placement cost three things. State died with the process, so a restart mid-validation lost the ledger of what had been driven. The agent had to run on the machine holding the browser, because the queue was reachable only in-process. And the browser-side shim was a string constant in the plugin, so fixing the automation logic meant reinstalling the plugin on every client.

The plugin library exists for exactly this split: the client runs the shell, the VPS runs the intelligence. The queue is state and coordination, which is the half that can move.

## Decision

The queue, the console ring, the stored screenshots and the shim source live in `plugin-manager/plugins/prototype/`, behind `POST /api/plugins/prototype/automation/<op>`, `GET .../shots/<id>` and `GET .../shim`. `dsh-prototype` proxies to them.

`config.endpoint` selects the backend once, at load. Configured, every automation call is proxied to the library, authenticated as whoever signed in through dsh-login. Absent, the in-process queue the plugin shipped with stays mounted. There is no runtime fallback between the two: a library that becomes unreachable answers `502`, and does not silently degrade into a second, divergent queue.

The local API does not move. `/prototype/api/automation/*` answers the same JSON either way, so the tab, the agent flow, and `03-prototype/SKILL.md` are unchanged by the migration.

### What stayed on the client, and why

The file server, the `prototype/` CRUD, the same-origin iframe, `getDisplayMedia` and `open` in the editor all need the user's own machine, and none of them moved. The iframe is the load-bearing one: prototypes are served same-origin so relative links and `localStorage` work for real, which means the page cannot be served from the VPS.

The shim follows from that. Its source of record is `plugins/prototype/shim.ts`, but the *page* never fetches it — a `<script src>` carries no `Authorization` header. The plugin fetches it with the signed-in credential, caches it for the process, and serves it at `/prototype/shim.js` on its own origin. The bundled copy answers when no endpoint is configured or the library is unreachable, and the log names which copy is live, because a stale shim presents as a page bug.

Screenshots are stored in both places on purpose. The library holds the durable copy as `bytea` and names it in `data.shot.url`; the plugin writes a cache copy to `prototype/.shots/` and names it in `data.saved`. The agent reads a capture as a file, so the PNG has to exist on the machine the agent runs on whichever store is authoritative. The `data:` URL itself is stripped from the recorded result — it is megabytes of base64 that would otherwise sit in front of the model on every read of the queue.

### Scoping and trust

The workspace travels as the opaque token `sha256(path).slice(0, 16)`, so no local path leaves the machine, and the library indexes every row by (user, workspace). The owner comes from the Bearer token and never from the body: the plugin runs on the client and is untrusted code. A screenshot id belonging to another account answers `404`, not `403`.

The 12 s command TTL is enforced lazily, on the reads that depend on it, rather than by a scheduled sweep — a tab that closes mid-command must not wedge the queue, and that is the only property the expiry owes.

## Alternatives considered

**Move the prototype files too.** Storing `prototype/` in the library would make prototypes recoverable across machines, but it breaks the same-origin iframe that makes relative links and `localStorage` work, and it splits the folder the agent's `write` tool and the user's editor both touch. Rejected for now; it is a product decision about where prototypes live, not a placement decision about state.

**Let the tab call the library directly.** Fewer hops, but the Bearer credential would have to reach the browser. Proxying through the plugin keeps the credential host-side, which is how `dsh-vps-status` already works.

**Fall back to the local queue when the library is unreachable.** Tempting for offline resilience, and wrong: two queues would diverge silently, and an agent would not know which one held its command. The mode is a load-time choice, and a transient failure is reported as one.

**Serve the shim to the page from the VPS.** It would remove the cached copy, but the endpoint would have to be public to be reachable by a `<script src>`, and the prototype would stop rendering offline.

**Keep the ring sizes in memory on the VPS.** A process-local ring would have carried the same limits with less schema, and lost the durability that motivated the move.

## Consequences

The queue survives restarts, the agent and the browser may sit on different machines, and the console and screenshot history outlive the session. A validation run is now inspectable after the fact rather than only while the tab is open.

The cost is a sign-in on the automation path: with nobody signed in, the API answers `401` with what to do about it. `dsh-login` must be mounted in the same profile, which the bundle patch states. `dsh-prototype` also stops being a dependency-free plugin — it now value-imports `dsh-login/vps-auth`.

Screenshots consume Postgres rather than the user's disk, capped at 8 MiB each, and the console ring is pruned on write. Neither has a retention policy beyond the 200-entry cap yet.

The intelligence this placement was meant to enable — compiling a BDD script into a command sequence, triaging a console dump, auditing a capture against the expected screen — is not built. This change moves the state those would read.
