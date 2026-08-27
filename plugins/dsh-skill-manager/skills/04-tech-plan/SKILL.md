---
name: 04-tech-plan
description: Settle the technical direction — architecture, mechanisms, boundaries, trade-offs — as mds/epics/<epic>/04-tech-plan.md with a traceability matrix into the frozen prototype contract, audited GREEN by a subagent. Brings only consequence-bearing decisions to the requester.
whenToUse: After /03-prototype is fully GREEN (prototype.md + audits). Before /06-tickets.
---

# Tech Plan

Settle the decisions a change depends on before any code exists. Read `/00-start-here` first. Skip for trivial changes where coding judgment suffices.

## Entry contract

Requires, all with `status: validated`: `01-brief.md`, `02-flows.md`, `03-prototype-validation.md`, plus audited-GREEN `prototype.md` and `db-schema.json`. Read them by path before deciding — `read`, not memory. **The UX is frozen**: the prototype is a UI contract, not an architecture spec — hardcoded credentials, fake auth/ZIP/rollback, toasts and localStorage are demonstrations to translate into real mechanisms, never literal requirements. Do not redesign, rename, cut or invent screens; if implementation reveals a needed UX change, stop and return to `/03-prototype`.

## Which decisions reach the requester

Decide alone and just state: language, libraries, layout, naming, schema shape, test strategy, error style — anything reversible in an afternoon. **Bring to the requester, phrased as consequences** (with `ask_user_question`, one per question): anything that changes what they receive, what it costs to run, how long it takes, what happens to their data, or what they are locked into. Ask the reversal too: "if we're wrong in six months, how bad is it?" Cheap to reverse → decide; expensive → consider `/05-debate`.

## Procedure

1. `read` brief, flows, prototype.md, db-schema.json.
2. **Ground truth**: inspect the actual code paths this change touches. A plan from assumption is the most expensive artifact there is.
3. **Freeze the UX IDs**: every screen/state/action in prototype.md gets a stable id (`UX-<screen>-<n>`) used by tickets.
4. **Frame technical forks only** — where engineers could reasonably disagree: storage, runtime, contracts, delivery, security, concurrency, backup, rollback, observability, tests.
5. Per decision, record: options, choice, why, rejected alternative, trade-off, reversibility.
6. **Translate** each prototype behaviour into its real mechanism (persistence replaces localStorage, real auth replaces fake) with the failure handling the mock hid.
7. **Traceability matrix**: every UX id → files/symbols, data, contracts, error states, tests. Every Must Do from the brief maps to ≥1 row.
8. Pressure-test: scale, hostile input, concurrency, process death, failed migration, restore from backup.
9. **Write** `mds/epics/<epic>/04-tech-plan.md` (shape below), optimized for `/06-tickets`: ordered implementation boundaries, concrete file/symbol names, dependencies, acceptance evidence.
10. **Audit with a `subagent`**: give it the plan path + all upstream artifact paths + "UX is frozen; prototype is a mock; CDNs allowed; audit technical completeness and traceability, do not redesign UX. GREEN or findings." Iterate to GREEN.

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
