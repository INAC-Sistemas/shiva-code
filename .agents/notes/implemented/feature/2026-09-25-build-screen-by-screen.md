# Agent Note: build the real system screen by screen, each screen a validated tarefa

Status: implemented

## Problem

Before this change, the `system-development` pipeline ran `/01-epic-brief → /02-core-flows → /03-prototype → /04-tech-plan → /06-tickets → /07-build → /08-review`.
- The prototype was static HTML with Tailwind from a CDN and data faked in localStorage. It was validated screen by screen and then frozen into `prototype.md`, with `UX-*` ids and a `db-schema.json`.
- Only after that did the pipeline write the tech plan, break the whole system into tickets with an execution plan, and create the real React app.
- During the build the requester was never asked anything ([the build never stops](2026-09-24-build-never-stops-and-shows-its-preview.md)). They used the system once, at the end.

This produced three problems:
- Every screen was built twice: once as a mock and once for real. Translating the mock into real mechanisms was a separate source of divergence, which needed frozen contracts, amendments and a traceability guard.
- The requester validated a mock, not what they would receive.
- The whole breakdown into tickets happened before any real code existed.

The product owner asked for three changes. The system is built right away. The prototype is the real frontend. Each screen is one tarefa, evaluated and tested until the requester validates it, and only then does the agent move to the next one.

## Decision

**The pipeline is `/00-start-here → /01-epic-brief → /02-core-flows → /03-plano → /04-construcao → /05-revisao`.** `/10-profiles` and `/11-connections` are unchanged.
- `/03-prototype`, `/06-tickets` and `/05-debate` are retired.
- `04-tech-plan` becomes `03-plano`, `07-build` becomes `04-construcao`, and `08-review` becomes `05-revisao`.
- The artifacts follow the stage numbers: `03-plano.md`, `04-decisoes.md` and `05-revisao.md`. Tarefas live in `mds/epics/<epic>/tarefas/`.

**`/03-plano` is the short stage before the first screen.**
- It moves the palette (`palette_pick` → `03-palette.md`) and the visual direction (`03-design.md`) here from the old prototype stage.
- It settles the stack, layout, fixed port, database conventions, authentication and authorization, shadcn preset, icons and engineering standards.
- It lists **the order of the screens** from `02-flows.md`. Screen 01 is the Authorization Layer whenever anyone signs in.
- The debate for a costly fork is a section of this stage, no longer a stage of its own.
- All consequence-bearing questions go in one call. The stage writes no code and no tarefa. The schema is not designed up front: each screen's tarefa adds its own migrations.

**`/04-construcao` builds one screen at a time, for real.**
- The principal creates the project (the framework generator plus `shadcn init`) and applies the palette and design to the theme CSS through a builder. It then starts the app in a terminal on the fixed port and opens the Browser tab.
- For each screen, in the plan's order, the loop runs these steps:
  1. The principal writes the tarefa (about 200 words: the screen, its roles, the flow steps it covers, the backend it needs, Done when). It sets `in_progress` and announces "iniciada".
  2. The builder builds the screen **and its real backend**.
  3. The principal sets `code_test` and announces "testando". The qa-tester writes tests under `testes/`. The principal walks the screen in the browser, and the evaluator returns GREEN or RED.
  4. On GREEN, the principal sets `human_test`, announces "pronta para sua validação", and asks the requester to validate the screen in the chat. Questions and credentials that only the requester has go in the same message. Then it waits.
  5. If the requester asks for adjustments, the tarefa goes back to `in_progress` with their words recorded. On "aprovado", the principal sets `done`, announces "finalizada (N de M)", and only then starts the next screen.
- Screens never run in parallel. The execution plan, the phases and "no human mid-epic" are gone.
- **The system is ready only when every tarefa is finalizada.**

**The word is "tarefa"** in every message, title and Kanban card the requester sees. It replaced "ticket", which the requester does not use. The frontmatter key `ticket:` and the `status:` values stay: they are the internal ids that the Kanban, the guard and existing epics read, and the requester never sees them.

**The Authorization Layer comes first.** `/01-epic-brief` stage D opens with D0: whether anyone signs in, the user types, their roles, what each role may and may never do, and who grants roles. The answer becomes the brief's `## Authorization layer` table. That table drives `/03-plano`'s screen 01 and the `## Roles` section of every tarefa.

**The guard and the Kanban follow the flow.**
- `dsh-tool-guard` lets the principal write `status: done`, since the principal writes it only after the requester's approval. Subagents are still denied.
- The guard drops the rules that depended on the prototype: the `prototype.md` freeze and the `UX-*` traceability check. `prototype` is removed from its roots.
- The guard keeps the `active → in_progress` rule, now on `tarefas/` as well as the legacy `06-tickets/`.
- `dsh-kanban` reads both folders. It shows the statuses as A fazer → Iniciada → Testando → Em validação → Finalizada.

**The VPS library migrates the rows.**
- `prisma/seed.ts` renames `04-tech-plan`, `07-build` and `08-review` in place (`RENAMED_SKILLS`). The id is kept, so every profile's selection survives, not only the "Padrão" profile's.
- It deletes the retired skills (`RETIRED_SKILLS`).
- The prerequisite map in both `agent.cordis.yml` presets now reads 03←02, 04←03 and 05←04.

## Alternatives considered

**Frontend first with mocked data, backend in a later round.** The product owner rejected this. It keeps the double build this change removes, and the screens the requester approved would change again when the real data arrived.

**The requester validates by moving the card on the Kanban.** Rejected in favour of approval in the chat. The chat is where they already are, and adjustments are words the agent needs anyway. The Kanban still accepts a manual move to Finalizada.

**Keep the stage names and leave gaps in the numbering.** The product owner rejected this in favour of renumbering. The seed's in-place rename keeps profile selections, which was the cost that made gaps attractive.

**Keep `/05-debate` as its own stage.** Rejected: the number is now `/05-revisao`, and a fork worth debating is part of planning. The procedure survives as a section of `/03-plano`.

## Consequences

- The requester is asked something at every screen, which reverses [the build never stops](2026-09-24-build-never-stops-and-shows-its-preview.md) for everything that changes what they receive. The questions asked before the build (brief stage F, the flows, the palette, the plan) are unchanged. The ledger, now `04-decisoes.md`, still holds the technical decisions the agent takes alone between validations.
- An epic takes as many requester round trips as it has screens, at least. In exchange, nothing reaches them twice, and what they approve is what ships.
- `dsh-prototype` and its Prototype tab stay installed but no skill uses them. The requester's preview is the Browser tab on `localhost`.
- The Kanban copy is Portuguese and hardcoded. `dsh-kanban` is a plugin outside the typed Client UI dictionaries.
- This note consolidates the earlier tarefas note ("one tarefa per functionality"). Its still-current decisions are the word "tarefa", the status announcements, the Authorization Layer first, and "ready only when every tarefa is finalizada"; they are stated above. The unit is now a screen, not a functionality.
- Epics started under the old flow keep their `06-tickets/` cards on the Kanban. Their `prototype.md` is no longer protected by the guard.

## Verification

- `node scripts/sync-skills.mjs --check` is clean, and no product skill mentions the retired stages, `prototype.md`, `prototype_automation` or the CDN prototype.
- `node --test plugins/dsh-tool-guard/test/allowlist.test.mjs` passes 14/14. This includes "done is written only by the principal, never by a subagent" and the `active → in_progress` rule on `tarefas/`.
- `plugins/dsh-skill-library` passes 73/73.
- On the local `plugin-manager-dev`, the seed logged the three renames and three retirements, then an idempotent second run. Every profile that selected the old stages now selects `03-plano`, `04-construcao` and `05-revisao`.
- The three plugin tarballs were repacked and their `desktop/package-lock.json` integrity values updated.
