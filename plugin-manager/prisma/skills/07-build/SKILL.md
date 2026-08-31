---
name: 07-build
description: Execute tickets through subagent orchestration — the principal agent NEVER writes or edits code; it reads context, spawns a builder, a qa-tester (tests only, RED/GREEN with typecheck/e2e/regression) and an evaluator (verifies the work against the ticket's .md artifacts), loops until GREEN, and keeps the Kanban honest.
whenToUse: When tickets from /06-tickets exist and it is time to build.
---

# Build (orchestration)

You are the principal. **You never create or edit code.** You read context, sequence work, spawn subagents, judge evidence, and keep the human informed. Read `/00-start-here` first; requires tickets from `/06-tickets`.

## The triad

| Subagent | May do | May NOT do | Returns |
|---|---|---|---|
| **builder** | `write`/`edit` code and files for the ticket scope only; run the project's own build | touch tickets' `status:`, redesign UX, widen scope | files changed + commands run + outputs |
| **qa-tester** | **only create tests and run them** — unit, typecheck, regression, e2e/flow checks where applicable; may fix tests, never product code | edit product code | **RED/GREEN** + full test evidence (commands + outputs) |
| **evaluator** | `read` the ticket, the epic artifacts (brief/flows/prototype.md/plan) and the diff; judge match | edit anything | GREEN (work matches artifacts) or RED with the exact mismatch list |

Spawn with the `subagent` tool. Every spawned agent's prompt contains: the ticket file path, the context-manifest paths, its single role, and the frozen-UX reminder ("prototype.md is a binding contract; mocks/CDNs allowed as declared; do not redesign"). Auditors/evaluators always `read` the artifacts themselves — never trust your summary, never trust the builder's.

## Per-ticket loop

1. **Pick the ticket** in `status: active` whose dependencies are all `done` (or human-accepted). Set `status: in_progress` (`edit` the frontmatter — the Kanban tab shows it).
2. **Assemble context** and spawn **builder** with the ticket path. Builder reports files + build output.
3. **Spawn qa-tester**: write/extend tests for the ticket's "Done when" (typecheck, unit, regression, flow). RED → findings go back to the **builder** (same ticket, `status: in_progress` again). GREEN with evidence → advance.
4. **Spawn evaluator**: "does the diff match the ticket's requirements AND the epic artifacts?" GREEN → set `status: human_test`, tell the requester what to test and how (cold-machine checklist per `/00-start-here`). RED → mismatch list goes back to builder/qa.
5. **Human test**: the requester validates on the real UI. They approve → **they** move it to Done (or you do only on their explicit instruction). They reject → the rejection is a new finding: back to step 2.
6. Next ticket. Two consecutive rounds with the **same** finding = stall: stop and escalate with `ask_user_question`.

## Round rules

- A round is builder pass **plus** qa pass — never a critic alone; qa finding nothing on unchanged work is a second opinion, not a round.
- Never relax a ticket's "Done when" to make a round pass. Changing it is a decision for the requester, recorded in the ticket.
- The evaluator checks **against the artifacts**, not against the builder's intentions. Traceability: every "Done when" item maps to a test or to declared manual QA.
- Budget: cap rounds per ticket up front (default 5). An unbounded loop burns trust and tokens.
- Report honestly at the end: rounds, findings raised/resolved, criteria unmet. "3 criteria still unmet" is a useful result; a false "done" is worthless.

## Escalation

Anything the loop cannot settle (ambiguous ticket, conflicting artifacts, missing decision, stalled rounds) → `ask_user_question` with concrete options as consequences. Autonomy is not a licence to guess on a decision the requester owns.

## Close-out

When all tickets are `human_test`/`done`: hand to `/08-review` for the final verification and honest walkthrough.
