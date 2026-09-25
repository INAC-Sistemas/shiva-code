---
name: 03-plano
description: The short stage between the validated flows and the first real screen — pick the palette and the visual direction with the requester, settle the technical direction (stack, layout, fixed port, database, authentication, shadcn preset, icons, engineering standards) and the order in which the screens will be built, starting with the Authorization Layer, as mds/epics/<epic>/03-plano.md. Brings only consequence-bearing decisions to the requester, in one call. Writes no tarefa and no code.
whenToUse: After /02-core-flows is validated (or written as a draft in `rapido` mode) and before /04-construcao. Requires /00-start-here and /02-core-flows loaded earlier in this session.
---

# Plano

Settle what the first line of code depends on, then get out of the way: `/04-construcao` builds the real system screen by screen right after this. Read `/00-start-here` first. There is no prototype stage — the first screen the requester sees is already the real frontend, running against the real backend.

## Entry contract

Requires `mds/epics/<epic>/01-brief.md` and `02-flows.md` with `status: validated` — or, when the brief says `mode: rapido`, with `status: draft`, to be approved here together with the plan. Read them by path — `read`, not memory — including the brief's `## Authorization layer` table and its **Surface and delivery** table: each of the six answers becomes a Decisions row or an explicit "none" with the reason.

## Part 0 — Palette and visual direction

`skill ui-palette`: propose palettes from the brief and let the requester choose with the `palette_pick` tool, which opens the Paletas tab by itself (presets, generator, custom hex), then record `mds/epics/<epic>/03-palette.md` with `status: validated`. No screen is built before that file exists.

Then `skill frontend-design` (it loads `ui-ux-pro-max` for the product type's style, fonts, landing pattern and effects): record `mds/epics/<epic>/03-design.md` — aesthetic direction, differentiation anchor, font pairing, composition and the motion tokens — and tell the requester the direction in one plain sentence. The first screen they approve in `/04-construcao` validates it (`status: validated`).

## Which decisions reach the requester

Decide alone and just state: language, libraries, layout, naming, schema shape, test strategy, error style — anything reversible in an afternoon. **Bring to the requester, phrased as consequences**, all in **one** `ask_user_question` call: anything that changes what they receive, what it costs to run, how long it takes, what happens to their data, or what they are locked into. Ask the reversal too: "if we're wrong in six months, how bad is it?"

**A costly fork** — two options where choosing wrong is expensive and one viewpoint is not enough — gets a short debate before the call: state the question and the alternatives in one sentence each, argue each option on its own (a `subagent` per option when it helps), give each the strongest objection of the other and demand a direct answer, pick against criteria named before the arguments, and record the verdict with what would change it in the Decisions row. One fork per debate; a debate over an obvious default is theatre.

## User interface

The backend may be any language and framework; **the frontend is always React styled with Tailwind CSS, built from shadcn/ui** — a house rule, not an option to weigh. **When the requester names no framework, the system is Next.js** — one app for frontend and backend (Route Handlers under `app/api/`), created with the `next` template; another framework only when the requester or the existing code names it, recorded with their words. `skill shadcn-ui` for the options. Record one Decisions row with the shadcn `init` template (`next` by default, `vite`, `laravel`, …), base (`radix` by default) and preset (`nova` by default).

Record the workspace layout as its own Decisions row: the project sits at the workspace root in its framework's layout, beside `mds/`, and the frontend sits at the root when the React app is the whole project or its template creates the backend too (`vite`, `next`, `react-router`, `laravel`…), or in `frontend/` beside a backend in another language. Name the backend's generator command. `skill shadcn-ui` step 1 creates each case.

Icons are a separate Decisions row: Lucide (`lucide-react`) by default, Tabler (`@tabler/icons-react`) only when Lucide lacks the glyph or a requester names it — `skill ui-icons` for the rules. A pack already in the project's `package.json` wins over both defaults.

Theme colors are a separate Decisions row that cites `03-palette.md` and names the theme CSS file of the chosen template and its value format — `skill ui-palette` for the rules. The plan never re-picks colors.

Fonts and motion are a separate Decisions row that cites `03-design.md`: how the pairing loads (`@fontsource` packages or a Google Fonts link), `motion` (`motion/react`) for JavaScript animation beside the `tw-animate-css` that `shadcn init` installs, and where the motion tokens live in the theme CSS — `skill frontend-design` section 4 and `skill tailwind-patterns`. A query library row (TanStack Query by default) serves `/react-ui-patterns`.

## Engineering standards

`skill engineering-standards` before writing Decisions: the responsibility of each layer (controllers, request validators, explicit data transfer objects only where a boundary needs decoupling, validation, transformation or a contract, use cases, models, response serializers, and repositories only when a real need is named), responses serialized by a layer dedicated to external representation (never models or internal structures), in one envelope, formal, up-to-date documentation of every public API contract (inputs, outputs, errors, authentication, HTTP status codes), webhooks in either direction (signature over the raw body, idempotency on the sender's event id, delivery from the queue, retries and a dead-letter destination, the event catalog), a consistent design system with reusable tokens, one standardized visualization library when the product needs charts, and asynchronous processing for long, heavy or external work — then the skill's stack rules for the technology of each. Record one Decisions row per rule naming the stack's concrete mechanism (folders per layer, request validation, response serializers, OpenAPI generator, webhook signature helper, queue). These are house rules, not options: only the requester overrides one, and their words are recorded.

## Authorization, data and servers

**Authentication and authorization** get their own Decisions rows, from the brief's `## Authorization layer` table: how a user signs in, where roles live, and the one permission check every route and screen uses. When the brief records "nobody signs in", the row says so.

Development runs on SQLite whenever the system needs a database (`skill engineering-standards` rule 8); record the production database and how one schema stays valid on both. The schema is not designed up front: each screen's tarefa adds the tables and migrations it needs, and the plan records only the conventions (naming, ids, timestamps, soft delete or not).

Record one Decisions row for **how the application runs locally**: the start command and a **fixed port** (pick one and write it down — `3100`, `4300`, whatever is free). `/04-construcao` starts that one instance in a terminal tab before the first screen, and every check points at it.

**Hosting is not decided here, and the requester is not asked about it now.** Provider, domain, account and credentials are asked after acceptance, in `/05-revisao`. Whether the system ships as a container is already answered in the brief; the plan records only what the target must support: the Docker image of `skill engineering-standards` rule 7, the environment variables, the persistent volume or managed database. The connection tools stay for later (`/11-connections`).

## The order of the screens

From `02-flows.md`, list every screen of the system, one line each: `NN — <screen, as the requester names it> — <roles that use it> — <flows it serves>`.

- **Screen 01 is always the Authorization Layer** when anyone signs in: sign-in (and sign-up or invitation when the brief names them), sign-out, the roles of the brief's table and the permission check every later screen reuses, plus the screen that grants and revokes roles when the brief names someone who does it.
- The rest follow in the order the flows meet them, the screens others depend on first.
- A capability with no screen of its own (an inbound webhook, a public API, the container delivery) is attached to the screen whose flow uses it; one with no screen at all goes at the end of the list as its own line.

This is a list, not tarefas: `/04-construcao` writes each tarefa when it starts that screen. Show the list to the requester in plain language with the rest of the plan.

## Procedure

1. `read` the brief and the flows.
2. Part 0: palette, then visual direction.
3. **Ground truth**: when the workspace already holds code, inspect the paths this touches. Use `web_search`/`web_fetch` to confirm a library's current API and maintenance before choosing it.
4. Frame the forks, debate the costly ones, and put every consequence-bearing question in one `ask_user_question` call.
5. **Write** `mds/epics/<epic>/03-plano.md` (shape below) with `status: draft`, present it in plain language, and set `status: validated` only after the requester confirms. In `rapido`, this is the one approval of the discovery: present the brief, the flows and the plan in one message — the problem in a sentence, the roles table, the flows as one line each, the screens in build order, the consequence-bearing decisions — ask once, fold any correction into the artifact it belongs to, and set all three to `status: validated` on the same yes.

## Artifact shape

```markdown
---
epic: <slug>
artifact: 03-plano
status: draft
---
# <what is being built>
## Problem (one paragraph)
## Decisions
| # | Question | Options | Choice | Why |
## Authorization (sign-in, where roles live, the permission check)
## Screens, in build order
| NN | Screen | Roles | Flows | Backend it needs |
## Boundaries (what this does NOT do)
## Risks (risk → trigger → mitigation)
## Open questions (each with what would answer it)
```

## Rules

- One decision per row; a row combining two choices hides the one never made.
- Trade-offs in the project's own terms, not textbook virtues.
- The plan describes the code as of its writing; when they later disagree, the code is right — `edit` the plan.
- Short beats complete: this stage exists so the first screen can start. Leave genuinely open questions open, each with what would settle it; the screen that needs the answer asks it at its validation.
- Write no tarefa and no code here.

## Next

When `03-plano.md` is validated, load `/04-construcao` with the `skill` tool. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
