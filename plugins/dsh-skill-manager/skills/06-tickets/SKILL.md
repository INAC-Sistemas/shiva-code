---
name: 06-tickets
description: Break an audited GREEN tech plan into self-contained implementation tickets — markdown files under mds/epics/<epic>/06-tickets/ with status frontmatter, full context manifest, agent protocols (implementer + independent auditor) — verified by a subagent before handoff. Tickets appear on the Kanban tab.
whenToUse: After /04-tech-plan is audited GREEN. Before /07-build.
---

# Ticket Breakdown

Turn a settled plan into tickets a stranger can execute without asking what was meant. Run only after the direction is decided and audited GREEN — breaking down an undecided plan produces tickets that dissolve on first contact with a real question.

## Entry gate

Requires, all readable by path: `01-brief.md`, `02-flows.md`, `03-prototype-validation.md` (validated), `prototype.md` (audited GREEN, UX frozen), `04-tech-plan.md` (audited GREEN). Read them; record their paths in every ticket. If any is missing or unreadable, stop and report — never guess.

## Ticket conventions

- Location: `mds/epics/<epic>/06-tickets/NN-<slug>.md` (NN = execution order).
- Frontmatter (the Kanban tab reads this): `ticket: <slug>`, `epic: <epic>`, `status: active`, `title: <imperative summary>`. **Never write `status: done`** — Done is the human's move on the Kanban.
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
3. Build the coverage matrix; cut tickets along **vertical seams** (independently finishable, testable, product still works), dependencies ordered, contracts before consumers.
4. `write` every ticket with the full body contract above.
5. Verify the tree: every ticket inside `06-tickets/`, frontmatter complete, deps point at existing files, matrix fully mapped.
6. **Audit the set with one `subagent`**: give it the plan + every ticket path — "verify coverage against the plan, self-containedness of each ticket (an implementer needs no conversation memory), and that implementer/auditor prompts carry enough context; UX frozen, mocks/CDNs allowed. GREEN or findings." Iterate to GREEN.
7. Hand off: "tickets are on the Kanban; execution is `/07-build`. Nothing has been coded."

## Rules

- "Done when" is observable or it does not exist — exact commands, expected outputs, recovery results.
- Every ticket names files and symbols; full manifest in every ticket, excerpts included — IDs alone are not permission to skip normative requirements.
- Out of scope is not optional; it is what stops tickets silently widening.
- Critical actions cannot be toast-only: visible state transition + recovery/cancel path required.
- Do not write code here. `/07-build` performs it.
