---
name: 06-tickets
description: Break an audited GREEN tech plan into self-contained implementation tickets — markdown files under mds/epics/<epic>/06-tickets/ with status frontmatter, full context manifest, agent protocols (implementer + independent auditor) — verified by a subagent, then close the stage by deciding and recording the execution strategy in mds/epics/<epic>/06-plano-de-execucao.md (real file-sharing dependency graph, sequential vs parallel, loop type, agent roles, verification and failure rules), confirmed by the requester. Tickets appear on the Kanban tab.
whenToUse: After /04-tech-plan is audited GREEN. Before /07-build.
---

# Ticket Breakdown

Turn a settled plan into tickets a stranger can execute without asking what was meant. Run only after the direction is decided and audited GREEN — breaking down an undecided plan produces tickets that dissolve on first contact with a real question.

## Entry gate

Requires, all readable by path: `01-brief.md`, `02-flows.md`, `03-prototype-validation.md` (validated), `prototype.md` (audited GREEN, UX frozen), `04-tech-plan.md` (audited GREEN). Read them; record their paths in every ticket. If any is missing or unreadable, stop and report — never guess.

## Ticket conventions

- Location: `mds/epics/<epic>/06-tickets/NN-<slug>.md` (NN = execution order).
- Frontmatter (the Kanban tab reads this): `ticket: <slug>`, `epic: <epic>`, `status: active`, `title: <imperative summary>`. Agents move a ticket `active → in_progress → code_test → human_test` (that is `/07-build`'s job). **Never write `status: done`** — Done is the human's move on the Kanban.
- Coverage matrix first: every UX id, Must Do, contract and test requirement maps to ≥1 ticket. Nothing unmapped.

## Ticket body contract

```markdown
---
ticket: <slug>
epic: <epic>
status: active
title: <imperative title>
---
# <imperative title>
## Goal (one independently verifiable outcome)
## Context manifest
- epic folder: mds/epics/<epic>/
- brief: 01-brief.md · flows: 02-flows.md · prototype contract: prototype.md
- tech plan: 04-tech-plan.md · db schema: db-schema.json
- UX ids covered: UX-…
## Requirements (exact excerpts from upstream artifacts)
## Implementation contract
- Files and concrete symbols (never "find where…" — that is a research task)
- APIs/schemas/error codes · state transitions · events/cleanup/rollback
- Compatibility constraints
## Steps (concrete implementation + evidence steps)
## Done when
- [ ] <observable condition>
- [ ] <exact command → expected output>
- [ ] Regression: <prior flow still works>
## Agent protocol
### Implementer prompt
Read this ticket and the context-manifest files. Implement only this scope. Do not redesign frozen UX or invent requirements. Run every check; report files, commands and results.
### Auditor prompt
Audit independently; never trust the implementer's summary. `read` this ticket, the manifest files and the diff. UX is frozen; prototype mocks/CDNs are allowed where declared. Reject toast-only coverage of critical flows, missing recovery, wrong files, unverifiable claims. GREEN only if every criterion passes; else list reproducible findings.
## Out of scope (adjacent behaviour that must not change)
## Depends on (<ticket files> or nothing)
```

## Procedure

1. `read` the plan and all upstream artifacts — never break down from conversation memory.
2. Verify the entry gate (statuses/audits). A missing artifact is a blocker, not an invitation to guess.
3. Build the coverage matrix; cut tickets along **vertical seams** (independently finishable, testable, product still works), dependencies ordered, contracts before consumers. Track the breakdown with `todo_write` when it spans several tickets.
4. `write` every ticket with the full body contract above.
5. Verify the tree: every ticket inside `06-tickets/`, frontmatter complete, deps point at existing files, matrix fully mapped.
6. **Audit the set with one `subagent`**: give it the plan + every ticket path — "verify coverage against the plan, self-containedness of each ticket (an implementer needs no conversation memory), and that implementer/auditor prompts carry enough context; UX frozen, mocks/CDNs allowed. GREEN or findings." Iterate to GREEN.
7. **Analyse the real dependency graph** (below) — declared dependencies are not enough; find the tickets that touch the same files or symbols.
8. **Ask the requester** the three execution questions (loop, parallelism, approval cadence) — plain language, options as consequences.
9. **Write `06-plano-de-execucao.md`** from the template below.
10. Present it; set `status: validated` only after the requester confirms.
11. Hand off: "tickets are on the Kanban and the execution plan is validated; execution is `/07-build`. Nothing has been coded."

## Execution strategy — closes the stage (mandatory)

The stage is **not** done when the tickets are written; it is done when the execution strategy is decided and recorded. This is a decision the requester owns, and it must survive in `mds/epics/<epic>/06-plano-de-execucao.md` so anyone picking up the epic can rebuild the reasoning. Without it, `/07-build` refuses to run.

**Step A — the real graph.** Read every ticket's "Implementation contract" (files + symbols). For each pair, compare the files and symbols they touch. A declared "depends on: nothing" is not proof of independence: two tickets can both declare independence and still edit the same helper — one creates it, the other rewrites its body. The real edge is a **shared file or a shared symbol**, not the declared dependency.

**Step B — classify.** For each ticket: `sequential (must follow <ticket>)` or `parallel with <tickets>` — always with the concrete reason (the shared file or symbol, or "writes a file no one else touches").

**Step C — ask the requester.** Use `ask_user_question`, one question at a time, in plain language, each option as a **consequence** (what they gain, what they lose, how long it takes). No orchestration jargon. The three questions:

1. **How each attempt works** — how a ticket gets done, and re-done when it fails:
   - "Each attempt starts from zero, with an agent that remembers nothing from the previous try" (exploratory work; each try is unbiased; costs more, because context is rebuilt every time).
   - "The same agents carry the ticket from start to finish — building, testing and checking" (planned work; faster and cheaper; a wrong early assumption can stick).
   - When the epic is already fully planned and audited, recommend the second.
2. **How much can run at once** — the parallelism:
   - "One at a time, in order" (simplest to follow; slowest).
   - "Only the independent fronts run together" (faster; depends on the analysis above being right).
   - "As much as the analysis allows" (fastest; most moving parts; a failure is harder to attribute).
3. **How much control over each step**:
   - "Approve each ticket before the next starts" (you see every step; slowest).
   - "Approve the whole sequence up front" (fast; you review at the end, not in the middle).

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
| Ticket | Declared depends on | Real edges (shared file or symbol) |
|---|---|---|
| NN-<slug> | <ticket or none> | <the file or symbol it shares, and with which ticket> |

## Sequential vs parallel
| Ticket | Class | Reason (the concrete file or symbol) |
|---|---|---|
| NN-<slug> | sequential after NN | … |
| NN-<slug> | parallel with NN | writes files no other ticket touches |

## Execution phases (in order)
1. Phase 1 — <tickets> — <what is finished when they are>
2. …

## Loop chosen by the requester
<the option chosen, in their words, and what it implies: how an attempt starts, what
carries over between attempts, and when it restarts from zero>

## Agent roles per phase
| Role | Builds | Tests | Evaluates | Must NOT |
|---|---|---|---|---|
| builder | … | — | — | touch `status:`, redesign UX |
| qa-tester | — | … | — | edit product code |
| evaluator | — | — | … | edit anything |

## Verification rule per ticket
<what must be proven with real output before a ticket counts as ready: the ticket's
"Done when" commands, the flow check, the regression>

## Kanban movement
<who moves a ticket and when: the agent moves `active → in_progress → code_test →
human_test`; **the human moves `human_test → done`, never the agent**>

## When a test fails
<the failure goes back to the builder for that ticket with the specific finding — the
ticket is not restarted from zero; two rounds with the same finding = escalate>
```

## Rules

- "Done when" is observable or it does not exist — exact commands, expected outputs, recovery results.
- Every ticket names files and symbols; full manifest in every ticket, excerpts included — IDs alone are not permission to skip normative requirements.
- Out of scope is not optional; it is what stops tickets silently widening.
- Critical actions cannot be toast-only: visible state transition + recovery/cancel path required.
- Do not write code here. `/07-build` performs it.
- The stage closes only with a **validated** `06-plano-de-execucao.md`; the loop type and the parallelism are the requester's decision, asked in plain language — never improvised by the agent.
- **Traceability must be real.** If a ticket or the coverage matrix cites an id (`UX-…`), that id MUST exist in the frozen `prototype.md`. In one epic 63 `UX-*` ids were cited while `prototype.md` contained none (only `data-screen` names), so "UX ids covered" was unverifiable for the whole build. Validate **mechanically** that every cited id resolves in the frozen contract, and fail if it does not. Also check the ticket does not contradict the plan's matrix (one epic's matrix said `POST /auth/login-{role}` while the ticket said a single `POST /auth/login`).
