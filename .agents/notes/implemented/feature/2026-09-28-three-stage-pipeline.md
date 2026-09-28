# Agent Note: three-stage pipeline: architecture, frontend, backend

Status: implemented

## Problem

The `system-development` pipeline ran `/01-epic-brief → /02-core-flows → /03-plano → /04-construcao → /05-revisao` ([build screen by screen](2026-09-25-build-screen-by-screen.md), [fast delivery](2026-09-25-fast-delivery-pipeline.md)). Each screen's tarefa carried its real frontend and the backend it needed, and a deploy conversation closed the epic.

The product owner asked for development split by specialty, in three stages:
1. An architect interviews the requester, defines every feature, the technology and the deploy mode, and saves it for the next stages.
2. A frontend developer and designer builds the pages one at a time. Each page is strongly typed, with structured payloads for the backend, shown in a live preview, and validated before the next page. At the end, the requester is asked whether they want more pages.
3. A backend engineer builds the whole backend and its tests from those payloads and the features. The stage announces its start and end, then asks whether to run the unit tests.

No deploy stage.

## Decision

**Three stage skills replace the five.**

| Stage | Replaces | What it does |
|---|---|---|
| `/01-arquitetura` | `/01-epic-brief`, `/02-core-flows`, and the technical half of `/03-plano` | Keeps the `rapido`/`completo` interview, the Authorization Layer and stages E and F. Adds stage G (stack and deploy mode). Writes one artifact, `01-arquitetura.md`: features, flows, Decisions, fixed port, and the pages in build order. |
| `/02-frontend` | the frontend half of `/04-construcao`, plus the palette and design of `/03-plano` | Chooses the palette (`02-palette.md`) and the visual direction (`02-design.md`). Creates the contract layer. Builds pages strictly one at a time; the next page starts only after the requester's "aprovado". Ends with "Deseja criar mais alguma página?". |
| `/03-backend` | the backend half of `/04-construcao`, plus `/05-revisao` without deploy | Announces its start. Writes one API tarefa per page's endpoints and has qa write unit and contract tests under `testes/`. Switches the mock off and walks every page on the real backend. Announces "aplicação pronta" and asks whether to run the unit tests, running them only on a yes. Writes `03-entrega.md`. |

**Payloads are Zod contracts.**
- Every request and response a page uses is a Zod schema in the contracts module (`src/contracts/` by default), with types inferred by `z.infer`.
- Pages call one typed API client that validates responses against those schemas.
- Until `/03-backend`, a mock API (MSW by default, switched by `NEXT_PUBLIC_API_MOCK`) answers from fixtures that parse against the same schemas.
- `02-contratos.md` indexes every endpoint.
- The backend validates input and serializes output with the same schemas, so switching the mock off changes no page.

**Specialization is a stage persona plus a builder briefing.** Each stage skill opens with the specialist the principal becomes. The builders get a frontend-specialist or backend-specialist briefing that names the helper skills to load. The `dsh-tool-guard` roles (`builder`, `qa`, `evaluator`) are unchanged: frontend and backend code often share one Next.js app, so a path-based split between them cannot be enforced.

**No deploy.**
- `/01-arquitetura` records the deploy mode (container on the requester's server, a managed platform, or local only) and what the target must support.
- No stage writes deploy files or asks for a provider, account or domain.
- `engineering-standards` rule 7 now names a containerization tarefa that runs only when the requester asks for the files after delivery.

**Library and client changes.**
- `seed.ts` renames `01-epic-brief → 01-arquitetura`, `04-construcao → 02-frontend` and `05-revisao → 03-backend` in place, so profile selections survive.
- It retires `02-core-flows` and `03-plano`.
- The `profile` presets' `prerequisites` enforce `00 → 01-arquitetura → 02-frontend → 03-backend`.
- The helper skills, `dsh-palette`, `dsh-kanban` and the dashboard hints name the new stages and artifacts (`02-palette.md`, `02-design.md`, `decisoes.md`).

## Alternatives considered

**Keep the five-stage pipeline and add the three-stage one beside it.** Rejected by the owner: two pipelines to maintain, and profiles would have to choose between them.

**Frontend on static data inside each page.** Rejected by the owner in favour of contracts plus a mock. Static data makes switching to the backend a rewrite of every page, and it leaves the payload structure undefined for the backend stage.

**One session or preset per stage, with the stage persona as the system prompt.** Rejected. A session cannot switch preset once it has produced anything, and only the top-level agent can call `ask_user_question`, so every stage would need its own conversation. A stage skill carries the persona within one session, and the load-order prerequisites keep the stages in order.

**New `frontend` and `backend` guard roles.** Rejected. The product layout is framework-defined (one Next.js app by default), so no path rule separates the two without false denials.

## Consequences

- Superseded in part by [no tests before delivery](2026-09-28-no-tests-before-delivery.md). `/03-backend` no longer has qa write unit and contract tests or asks to run them; it asks after the delivery whether to implement a test battery for audit. `/02-frontend` asks the requester for a visual approval, and the principal's pre-handover walk is a visual check.
- The requester sees the final UI before any backend exists. A backend constraint that forces a visible change is announced before it ships.
- A contract that proves wrong in `/03-backend` is changed in the contract, the mock, the page and the backend together, and recorded in `decisoes.md`.
- Page validation no longer overlaps the build of the next page, so an epic waits on the requester once per page. The owner accepted this in exchange for validating each page before the next.
- API tarefas skip `human_test`. The principal finalizes them after its own walk with the mock off.
- Epics started under the five-stage pipeline cannot resume through the new stage names. Their artifacts (`01-brief.md`, `03-plano.md`, `tarefas/`) remain readable, and the Kanban still boards their tarefas.

## Verification

- `node scripts/sync-skills.mjs --check` reports no drift between `plugins/dsh-skill-manager/skills` and `plugin-manager/prisma/skills`.
- `plugins/dsh-skill-library/tests/prerequisites.spec.ts` passes with the new stage names.
- No helper skill, plugin, preset or dashboard file names `01-epic-brief`, `02-core-flows`, `03-plano`, `04-construcao` or `05-revisao`, except the `seed.ts` rename and retire lists.
