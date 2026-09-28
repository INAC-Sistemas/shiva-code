# Agent Note: the build runs on a one-screen conveyor and discovery is short by default

Status: implemented

## Problem

The product owner reported that delivering a system through the `system-development` pipeline was too slow. Two causes were confirmed:
- **Waiting between screens.** [Build screen by screen](2026-09-25-build-screen-by-screen.md) made the principal end its turn at every `human_test` and start nothing until the requester approved. An epic with nine screens spent nine human review times with the agent idle.
- **Each screen took long.** After the builder, the qa-tester, the principal's browser walk and the evaluator ran in series, the qa-tester's tests (run only in `/05-revisao`) sat on the critical path, and any evaluator RED cost a builder round, with a budget of five.

The owner also asked for adaptive discovery: `/01-epic-brief` required about 45 answers (Lean Startup, Business Model Canvas, Design Thinking, D0, E, F), and the brief, the flows and the plan were approved separately before the first screen.

## Decision

**`/04-construcao` builds on a conveyor one screen deep.**
- When screen N reaches `human_test`, the principal starts screen N+1 in the same reply. It never runs more than one screen ahead of the oldest unapproved screen; with the conveyor full, it ends the turn.
- Only one builder runs in the workspace at a time. An adjustment to N waits for N+1's builder to return, unless it changes N+1, in which case `interrupt_agent` stops N+1 first.
- Feedback on N that also applies to other screens is copied into N+1's `## Validation` and its builder's GAP.
- Screens that reached `human_test` while the requester was away are validated in one message.
- `status: done` is still written only by the principal after an explicit approval, and the system is still ready only when every tarefa is finalizada.

**Each screen's checks run in parallel.** The evaluator and the qa-tester are spawned in one step while the principal walks the screen. The screen reaches the requester on the walk plus GREEN; qa tests land whenever they return. RED blocks only on Done-when misses, permission, data, loading/error/empty states, critical accessibility, and palette, icon, shadcn or motion violations; smaller findings go to `04-decisoes.md` and the next briefing. The RED budget is three rounds. The principal fixes one- or two-line defects its own walk exposes in the guard's existing fast-fix window.

**Discovery is `rapido` by default.** The brief records `mode: rapido | completo`.
- `rapido` asks A1–A2, q32, q39, D0, D, E and F in at most three `ask_user_question` calls. The brief and flows stay `draft`; `/03-plano` presents brief, flows and plan in one message and sets all three to `validated` on one yes.
- `completo` keeps every stage and its separate approval. It is for a new product the requester intends to sell, or on request.

No plugin code changes: `dsh-tool-guard` already allows several open tarefas and keeps `done` for the principal, `dsh-kanban` already boards any number of cards per column, and the `skill` tool's load-order prerequisites are unchanged.

## Alternatives considered

**Validate by module (two to four screens per approval).** Rejected by the owner in favour of the conveyor: each screen keeps its own validation, and the agent is still never idle.

**Keep the strict wait and only speed up each screen.** Rejected: the human review time is the larger cost and only overlapping it removes it.

**Two or more screens ahead, or parallel builders.** Rejected: a cross-cutting adjustment would ripple into more rework, and builders sharing one workspace overwrite each other's files.

## Consequences

- Superseded in part by [three-stage pipeline: architecture, frontend, backend](2026-09-28-three-stage-pipeline.md). `rapido`/`completo` discovery remains current inside `/01-arquitetura`; the one-screen conveyor was replaced by strictly sequential pages in `/02-frontend`.
- Up to two tarefas are open at once (one in `human_test`, one in `in_progress` or `code_test`).
- An adjustment that changes shared code can force rework on the screen already ahead; the one-screen limit bounds it to one screen.
- A `rapido` brief records the skipped Lean Startup, Canvas and Design Thinking stages under `## Unknowns`.

## Verification

- `node scripts/sync-skills.mjs --check` is clean after mirroring to `plugin-manager/prisma/skills`.
- No skill still tells the principal to wait between screens.
- `node --test plugins/dsh-tool-guard/test/allowlist.test.mjs` passes.
