---
name: 06-tickets
description: Break a settled tech plan into tarefas — one per functionality of the system, each carrying its backend and its frontend when the functionality needs both, short and objective — as markdown files under mds/epics/<epic>/06-tickets/ with status frontmatter and a context manifest, then close the stage by deciding and recording the execution strategy in mds/epics/<epic>/06-plano-de-execucao.md (real file-sharing dependency graph, sequential vs parallel, loop type, agent roles, verification and failure rules), confirmed by the requester. Tarefas appear on the Kanban tab.
whenToUse: After /04-tech-plan is written. Before /07-build. Requires /00-start-here and /04-tech-plan loaded earlier in this session.
---

# Tarefas

Turn a settled plan into the list of the system's functionalities, one **tarefa** each, that a stranger can execute without asking what was meant. Run only after the direction is decided — breaking down an undecided plan produces tarefas that dissolve on first contact with a real question.

**The word is "tarefa"**, in every message, title and Kanban card the requester sees — never "ticket", "issue" or "card". The folder `06-tickets/`, this skill's name and the frontmatter key `ticket:` are internal identifiers the Kanban and the guard read, and stay as they are.

## Entry gate

Requires, all readable by path: `01-brief.md`, `02-flows.md`, `03-prototype-validation.md` (validated), `prototype.md` (UX frozen), `04-tech-plan.md`. Read them; record their paths in every tarefa. If any is missing or unreadable, stop and report — never guess.

## One tarefa = one functionality

- **A tarefa is a functionality of the system**: something a user (or a system that calls it) can do once it is finished — "Cadastrar cliente", "Entrar no sistema", "Exportar relatório de vendas", "Receber webhook de pagamento". Its title names that functionality in the requester's language, with a verb, as they would say it.
- **It carries every layer the functionality needs.** When it has a screen and a server side, the backend (route, request validator, use case, response serializer, migration) and the frontend (screen, components, loading/error/empty states) are the **same** tarefa. When it has only one side — an endpoint other systems consume, a screen over data that already exists — the tarefa has only that side. Never split one functionality into a "backend tarefa" and a "frontend tarefa".
- **Every functionality of the system is a tarefa, and every tarefa is a functionality.** The list comes from the brief's Must do, every flow in `02-flows.md`, every screen of `prototype.md`, and every **yes** in the brief's Surface and delivery topics (an API with its documented endpoints and `/docs`, a webhook in each declared direction, a role with its permission checks, an integration, a report with its screen and export, a container delivery). No functionality without a tarefa; no tarefa that is only plumbing — a shared foundation (the schema, the app layout, the auth middleware) is built inside the first tarefa whose functionality needs it.
- **Short and objective.** A tarefa that does not fit its budget (below) is two functionalities: split it by what the user can do ("Cadastrar produto", "Editar produto"), never by layer.

## Tarefa conventions

- Location: `mds/epics/<epic>/06-tickets/NN-<slug>.md` (NN = execution order).
- Frontmatter (the Kanban tab reads this): `ticket: <slug>`, `epic: <epic>`, `status: active`, `title: <the functionality>`. **Never write `status: done`** — Done is the human's move on the Kanban.
- The status is what the requester is told (`/07-build` announces every move):

| `status:` | Kanban column | What the requester hears |
|---|---|---|
| `active` | A fazer | — |
| `in_progress` | Iniciada | "Tarefa NN — <title>: iniciada" |
| `code_test` | Testando | "Tarefa NN — <title>: testando" |
| `human_test` | Finalizada | "Tarefa NN — <title>: finalizada" |
| `done` | Aceita | the requester's own move, after using the whole system |

- **The system is finished when every tarefa is finalizada** (`human_test`, or `done` after acceptance) — not before, and not by any other measure.
- Traceability: every UX id, contract and test requirement lands in the tarefa of the functionality it belongs to. Nothing unmapped.
- **The publication tarefa exists only when the brief's Surface and delivery topics asked for a container**, and then it is the last tarefa of the last phase — the build ends with it finalizada, not with it pending. It counts as the functionality "the system runs as a container". When the brief said no container, there is no publication tarefa at all. It is the only tarefa that writes deploy files — `Dockerfile`, `.dockerignore`, `docker/entrypoint.sh` applying migrations and running the idempotent seed on every start, `docker-compose.yml` (`skill engineering-standards` rule 7) — and no earlier tarefa may create or check any of them. Its provider, account and domain are not decided now — those are asked after acceptance, in `/08-review`.

## Tarefa body contract

```markdown
---
ticket: <slug>
epic: <epic>
status: active
title: <the functionality, with a verb>
---
# Tarefa NN — <the functionality>
## Functionality (one sentence: what the user can do when this tarefa is finalizada)
## Context manifest
- epic folder: mds/epics/<epic>/ — only the artifacts this tarefa uses, by path and section
- UX ids covered: UX-…
## Requirements (the exact lines of the upstream artifacts this tarefa must satisfy — quoted, never a copied section)
## Backend (omit when the functionality has none)
- Files and concrete symbols: route, request validator, use case, response serializer, migration, any data transfer object or repository with the reason it is needed (`skill engineering-standards`) — never "find where…"
- Error codes and state transitions
## Frontend (omit when the functionality has none)
- Screen and components with their files; loading, error and empty states; the UX ids it implements
## Tests to write (cases for the Done when; written under `testes/`, run as one battery in /08-review)
## Done when
- [ ] <the flow step the principal walks in the running app → what is seen>
- [ ] <observable condition on the backend, when there is one>
- [ ] Regression: <prior flow still works>
- [ ] The engineering standards this tarefa actually touches, named one by one (`skill engineering-standards`, "In /06-tickets")
## Out of scope (adjacent behaviour that must not change)
## Depends on (<tarefa files> or nothing)
```

The implementer prompt is the default one — "read this tarefa and its manifest, implement only this functionality, do not redesign frozen UX or invent requirements, report files, commands and results" — and it is written into a tarefa only when that tarefa needs something different.

## Procedure

1. `read` the plan and all upstream artifacts — never break down from conversation memory.
2. Verify the entry gate (statuses). A missing artifact is a blocker, not an invitation to guess.
3. **List the functionalities** (see "One tarefa = one functionality"): one line each, with the brief, flow, screen or Surface topic it comes from. Show that list to the requester in plain language as the list of tarefas before writing any file — it is the list of what the system will do. Order it by dependency, the functionalities others build on first. Track the breakdown with `todo_write` when it spans several tarefas.
4. `write` every tarefa with the body contract above.
5. Verify the tree: every tarefa inside `06-tickets/`, frontmatter complete, deps point at existing files, every functionality on the list has exactly one tarefa and every tarefa is on the list.
6. **Analyse the real dependency graph** (below) — declared dependencies are not enough; find the tarefas that touch the same files or symbols.
7. **Ask the requester** the three execution questions (loop, parallelism, how they are kept informed) in one `ask_user_question` call — plain language, options as consequences. This is the last thing asked before the build; from `/07-build` on, whatever comes up is decided and reported.
8. **Write `06-plano-de-execucao.md`** from the template below.
9. Present it; set `status: validated` only after the requester confirms.
10. Hand off: "tarefas are on the Kanban and the execution plan is validated; execution is `/07-build`. Nothing has been coded."

## Execution strategy — closes the stage (mandatory)

The stage is **not** done when the tarefas are written; it is done when the execution strategy is decided and recorded. This is a decision the requester owns, and it must survive in `mds/epics/<epic>/06-plano-de-execucao.md` so anyone picking up the epic can rebuild the reasoning. Without it, `/07-build` refuses to run.

**Step A — the real graph.** Read every tarefa's "Implementation contract" (files + symbols). For each pair, compare the files and symbols they touch. A declared "depends on: nothing" is not proof of independence: two tarefas can both declare independence and still edit the same helper — one creates it, the other rewrites its body. The real edge is a **shared file or a shared symbol**, not the declared dependency.

**Step B — classify.** For each tarefa: `sequential (must follow <tarefa>)` or `parallel with <tarefas>` — always with the concrete reason (the shared file or symbol, or "writes a file no one else touches").

**Step C — ask the requester.** These three are independent, so they go in **one** `ask_user_question` call, in plain language, each option as a **consequence** (what they gain, what they lose, how long it takes). No orchestration jargon. The three questions:

1. **How each attempt works** — how a tarefa gets done, and re-done when it fails:
   - "Each attempt starts from zero, with an agent that remembers nothing from the previous try" (exploratory work; each try is unbiased; costs more, because context is rebuilt every time).
   - "The same agents carry the tarefa from start to finish — building, testing and checking" (planned work; faster and cheaper; a wrong early assumption can stick).
   - When the epic is already fully planned, recommend the second.
2. **How much can run at once** — the parallelism:
   - "One at a time, in order" (simplest to follow; slowest).
   - "Only the independent fronts run together" (faster; depends on the analysis above being right).
   - "As much as the analysis allows" (fastest; most moving parts; a failure is harder to attribute).
3. **How they want to be kept informed while it is built**:
   - "Tell me each decision as you take it, in one line" (recommended — they watch the system fill the preview and read every decision as it happens).
   - "Just give me the whole list at the end" (quieter; they read the decisions at delivery).
   Say this before the call, in their language: **either way the build does not stop to ask.** From the first tarefa to the last, whatever comes up is decided, written into `07-decisoes.md` and told to them — these options choose only *when* they hear it. The status of every tarefa — iniciada, testando, finalizada — is announced as it changes whatever they choose; that is not part of the question.

Record the answer **and what it implies**, not just the label.

**Step D — write the artifact** `mds/epics/<epic>/06-plano-de-execucao.md` (template below), `status: draft`.

**Step E — validate.** Show it in plain language; set `status: validated` only when the requester confirms.

## Execution plan template

```markdown
---
epic: <slug>
artifact: 06-plano-de-execucao
status: draft
---
# Execution plan — <initiative>

## Real dependency graph
| Tarefa | Declared depends on | Real edges (shared file or symbol) |
|---|---|---|
| NN-<slug> | <tarefa or none> | <the file or symbol it shares, and with which tarefa> |

## Sequential vs parallel
| Tarefa | Class | Reason (the concrete file or symbol) |
|---|---|---|
| NN-<slug> | sequential after NN | … |
| NN-<slug> | parallel with NN | writes files no other tarefa touches |

## Execution phases (in order)
1. Phase 1 — <tarefas> — <what is finished when they are>
2. …

## Loop chosen by the requester
<the option chosen, in their words, and what it implies: how an attempt starts, what
carries over between attempts, and when it restarts from zero>

## Agent roles per phase (the `role` each spawn passes to the guard)
| Role | `role:` | Builds | Writes tests | Evaluates | Must NOT |
|---|---|---|---|---|---|
| builder | `builder` | … | — | — | touch `status:`, redesign UX |
| qa-tester | `qa` | — | … | — | edit product code, run the battery |
| evaluator | `evaluator` | — | — | … | write anything at all |

## Verification rule per tarefa
<what must be proven with real output before a tarefa counts as ready: the tarefa's
"Done when" commands, the flow check, the regression>

## Kanban movement
<who moves a tarefa and when: the agent moves `active → in_progress` (iniciada) `→
code_test` (testando) `→ human_test` (finalizada) and announces each move; **the human
moves `human_test → done`, never the agent**. The system is finished when every tarefa
is finalizada>

## When a test fails
<the failure goes back to the builder for that tarefa with the specific finding — the
tarefa is not restarted from zero; two rounds with the same finding = change the approach>
```

## Rules

- "Done when" is observable or it does not exist — exact commands, expected outputs, recovery results.
- Every tarefa names files and symbols, and carries the manifest paths plus the quoted lines it must satisfy — an id alone is not permission to skip a normative requirement.
- **Budget: about 250 words per tarefa — short and objective.** Boilerplate repeated across tarefas is the measured cost of this stage — in one epic, 21 tarefas of ~1,200 words each, most of it the same manifest, the same standards list and the same prompts. Quote the lines that bind *this* tarefa, point at the rest by path (`04-tech-plan.md` "Decisions" row 3, `prototype.md` `UX-CAT-02`), and write only what differs from the default prompt. A tarefa that cannot fit is two functionalities — split it by what the user can do, never by layer.
- Out of scope is not optional; it is what stops tarefas silently widening.
- Critical actions cannot be toast-only: visible state transition + recovery/cancel path required.
- Do not write code here. `/07-build` performs it.
- The stage closes only with a **validated** `06-plano-de-execucao.md`; the loop type and the parallelism are the requester's decision, asked in plain language — never improvised by the agent.
- **Traceability must be real.** If a tarefa or the functionality list cites an id (`UX-…`), that id MUST exist in the frozen `prototype.md`. In one epic 63 `UX-*` ids were cited while `prototype.md` contained none (only `data-screen` names), so "UX ids covered" was unverifiable for the whole build. Validate **mechanically** that every cited id resolves in the frozen contract, and fail if it does not. Also check the tarefa does not contradict the plan's matrix (one epic's matrix said `POST /auth/login-{role}` while the tarefa said a single `POST /auth/login`).

## Next

When the tarefas and `06-plano-de-execucao.md` are validated, load `/07-build` with the `skill` tool. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
