---
name: 04-tech-plan
description: Settle the technical direction — architecture, mechanisms, boundaries, trade-offs — as mds/epics/<epic>/04-tech-plan.md with a traceability matrix into the frozen prototype contract. Brings only consequence-bearing decisions to the requester.
whenToUse: After /03-prototype is fully GREEN and prototype.md is frozen. Before /06-tickets. Requires /00-start-here and /03-prototype loaded earlier in this session.
---

# Tech Plan

Settle the decisions a change depends on before any code exists. Read `/00-start-here` first. Skip for trivial changes where coding judgment suffices.

## Entry contract

Requires, all with `status: validated`: `01-brief.md`, `02-flows.md`, `03-prototype-validation.md`, `03-palette.md`, `03-design.md`, plus the frozen `prototype.md` and `db-schema.json`. Read them by path before deciding — `read`, not memory. **The UX is frozen**: the prototype is a UI contract, not an architecture spec — hardcoded credentials, fake auth/ZIP/rollback, toasts and localStorage are demonstrations to translate into real mechanisms, never literal requirements. Do not redesign, rename, cut or invent screens; if implementation reveals a needed UX change, stop and return to `/03-prototype`.

## Which decisions reach the requester

Decide alone and just state: language, libraries, layout, naming, schema shape, test strategy, error style — anything reversible in an afternoon. **Bring to the requester, phrased as consequences** (with `ask_user_question`, one per question): anything that changes what they receive, what it costs to run, how long it takes, what happens to their data, or what they are locked into. Ask the reversal too: "if we're wrong in six months, how bad is it?" Cheap to reverse → decide; expensive → consider `/05-debate`.

## User interface

The backend may be any language and framework; **the frontend is always React styled with Tailwind CSS, built from shadcn/ui** — a house rule, not an option to weigh. **When the requester names no framework, the system is Next.js** — one app for frontend and backend (Route Handlers under `app/api/`), created with the `next` template; another framework only when the requester or the existing code names it, recorded with their words. `skill shadcn-ui` for the options. Record one Decisions row with the shadcn `init` template (`next` by default, `vite`, `laravel`, …), base (`radix` by default) and preset (`nova` by default).

Record the workspace layout as its own Decisions row: the project sits at the workspace root in its framework's layout, and the frontend sits at the root when the React app is the whole project or its template creates the backend too (`vite`, `next`, `react-router`, `laravel`…), or in `frontend/` beside a backend in another language. Name the backend's generator command. `skill shadcn-ui` step 1 creates each case. The traceability matrix names the shadcn component or block behind each UX id wherever one exists.

Icons are a separate Decisions row: Lucide (`lucide-react`) by default, Tabler (`@tabler/icons-react`) only when Lucide lacks the glyph or a requester names it — `skill ui-icons` for the rules. A pack already in the project's `package.json` wins over both defaults.

Theme colors are a separate Decisions row that cites `03-palette.md` (read it by path with the other inputs) and names the theme CSS file of the chosen template and its value format — `skill ui-palette` for the rules. The requester already chose the palette; the plan never re-picks colors, and a palette change returns to `/03-prototype` as an amendment.

Fonts and motion are a separate Decisions row that cites `03-design.md`: how the pairing loads (`@fontsource` packages or a Google Fonts link), `motion` (`motion/react`) for JavaScript animation beside the `tw-animate-css` that `shadcn init` installs, and where the motion tokens live in the theme CSS — `skill frontend-design` section 4 and `skill tailwind-patterns`. The prototype's motion is part of the frozen UX: the app reproduces it, never drops it. A query library row (TanStack Query by default) serves `/react-ui-patterns`.

## Engineering standards

`skill engineering-standards` before writing Decisions: the responsibility of each layer (controllers, request validators, explicit data transfer objects only where a boundary needs decoupling, validation, transformation or a contract, use cases, models, response serializers, and repositories only when a real need is named), responses serialized by a layer dedicated to external representation (never models or internal structures), in one envelope, formal, up-to-date documentation of every public API contract (inputs, outputs, errors, authentication, HTTP status codes), a consistent design system with reusable tokens, one standardized visualization library when the product needs charts, and asynchronous processing for long, heavy or external work (which operations, retries, failure handling, status, workers) — then the skill's stack rules for the technology of each — the backend rules hold in any language, so record the backend language and framework and map each role to its mechanism (the skill's mapping table shows examples); the frontend is React with Tailwind CSS and Recharts. Record one Decisions row per rule naming the stack's concrete mechanism (folders per layer, request validation, response serializers, OpenAPI generator, queue), and name each endpoint's request validator, use case and response serializer in the traceability matrix. These are house rules, not options: only the requester overrides one, and their words are recorded.

## Delivery, data and servers

The workspace's connection tools are the real mechanism for these, and the plan names them instead of hand-rolling. Each is an agent tool (see `/11-connections`): `railway_cli`/`vercel_cli` (deploy), `supabase_cli` (database/SQL/auth), `github_cli` (repo/PR), plus `ssh_run`/`ssh_transfer` (external VPS).

Check reality before writing the plan: call `status` on the provider the epic will use — it says whether the CLI is installed, the account is connected and the workspace is linked. `login` opens the browser for the human to authorize once. Name which provider the epic uses and the boundary it must not cross.

Every system deploys as the Docker image of `skill engineering-standards` rule 7, so the hosting target must run that image: Railway builds the root `Dockerfile`, and a VPS runs it with `docker compose` over `ssh_run`. Vercel does not run the image and its migrations-on-start entrypoint; choose it only when the requester asks, recorded with their words and with how migrations and seed run there instead.

## Procedure

1. `read` brief, flows, prototype.md, db-schema.json.
2. **Ground truth**: inspect the actual code paths this change touches. A plan from assumption is the most expensive artifact there is. Use `web_search`/`web_fetch` to confirm a library's current API and maintenance before choosing it.
3. **Freeze the UX IDs**: every screen/state/action in prototype.md gets a stable id (`UX-<screen>-<n>`) used by tickets.
4. **Frame technical forks only** — where engineers could reasonably disagree: storage, runtime, contracts, delivery, security, concurrency, backup, rollback, observability, tests.
5. Per decision, record: options, choice, why, rejected alternative, trade-off, reversibility.
6. **Translate** each prototype behaviour into its real mechanism (persistence replaces localStorage, real auth replaces fake) with the failure handling the mock hid.
7. **Traceability matrix**: every UX id → files/symbols, data, contracts, error states, tests. Every Must Do from the brief maps to ≥1 row.
8. Pressure-test: scale, hostile input, concurrency, process death, failed migration, restore from backup.
9. **Write** `mds/epics/<epic>/04-tech-plan.md` (shape below), optimized for `/06-tickets`: ordered implementation boundaries, concrete file/symbol names, dependencies, acceptance evidence.

## Artifact shape

```markdown
---
epic: <slug>
artifact: 04-tech-plan
status: draft
---
# <what is being built>
## Problem (one paragraph)
## Decisions
| # | Question | Options | Choice | Why |
## Mechanism (how it works; mermaid when >3 participants)
## UX traceability (UX-id → files/symbols → data → contracts → tests)
## Boundaries (what this does NOT do; contracts it must not break)
## Risks (risk → trigger → mitigation)
## Open questions (each with what would answer it)
```

## Rules

- One decision per row; a row combining two choices hides the one never made.
- Name files and symbols concretely, never "the API layer".
- Trade-offs in the project's own terms, not textbook virtues.
- The plan describes the code as of its writing; when they later disagree, the code is right — `edit` the plan.
- Leave genuinely open questions open, each with what evidence would settle it. Never invent a decision.
- Do not create tickets here. That is `/06-tickets`.

## Next

When the plan is written, load `/06-tickets` with the `skill` tool. If a decision is a costly fork first, load `/05-debate`, record the verdict here, then continue to `/06-tickets`. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
