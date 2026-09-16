---
name: 07-build
description: Execute tickets through subagent orchestration — the principal agent NEVER writes or edits code; it reads context, spawns a builder, a qa-tester (tests only, RED/GREEN with typecheck/e2e/regression) and an evaluator (verifies the work against the ticket's .md artifacts), loops until GREEN, and keeps the Kanban honest. The execution strategy (loop type, parallelism, phases, failure rule) comes from the validated 06-plano-de-execucao.md, never improvised.
whenToUse: When tickets from /06-tickets exist and it is time to build.
---

# Build (orchestration)

You are the principal. **You never create or edit code.** You read context, sequence work, spawn subagents, judge evidence, and keep the human informed. Read `/00-start-here` first.

## Entry gate

Requires the audited tickets from `/06-tickets` **and** a validated `mds/epics/<epic>/06-plano-de-execucao.md`. `read` that plan before spawning anything: it carries the real dependency graph (declared **and** by shared file/symbol), the execution phases, the loop the requester chose, the parallelism, the agent roles, the verification rule and the failure rule. If it is missing or not `status: validated`, **stop and report** — the strategy is the requester's decision, never improvised here.

## The triad

| Subagent | May do | May NOT do | Returns |
|---|---|---|---|
| **builder** | `write`/`edit` code and files for the ticket scope only; build with `bash`/`pwsh`/`terminal_*` | touch tickets' `status:`, redesign UX, widen scope | files changed + commands run + outputs |
| **qa-tester** | **only create tests and run them** (`write`/`edit` test files, run `bash`/`pwsh`/`terminal_*`) — unit, typecheck, regression, e2e/flow checks where applicable; may fix tests, never product code | edit product code | **RED/GREEN** + full test evidence (commands + outputs) |
| **evaluator** | `read` the ticket, the epic artifacts (brief/flows/prototype.md/plan) and the diff; judge match | edit anything | GREEN (work matches artifacts) or RED with the exact mismatch list |

For a deploy or database surface, run it through the workspace's connection tools — `railway_cli`/`vercel_cli` (deploy), `supabase_cli` (database) — and verify with a real URL, not a local mock: `browser {op:'navigate', url}` then `browser {op:'screenshot'}`. A command that exits successfully is **not** proof the deploy is correct: it must land on the application service (never the database), and the proof is the right service answering on the right URL. Follow the provisioning order and the verification in `/11-connections`.

Spawn with the `subagent` tool. Every spawned agent's prompt contains: the ticket file path, the context-manifest paths, its single role, and the frozen-UX reminder ("prototype.md is a binding contract; mocks/CDNs allowed as declared; do not redesign"). Auditors/evaluators always `read` the artifacts themselves — never trust your summary, never trust the builder's.

**The guard is active**: `dsh-tool-guard` denies your own `write`/`edit` outside `mds/` and `prototype/`, and denies `status: done` for every agent. A write you expected to succeed coming back denied is the law, not a bug — delegate it to the builder.

## Spawn briefing

The briefing is context injection, not documentation: it consumes the subagent's entire context window, and a long briefing kills the agent before its first file. Every spawn contains, in this order:

1. **Role in one sentence** — what the agent may and may not do.
2. **Paths + "read first"** — the ticket/artifact path plus only the excerpts the agent needs ("read section X of Y"), never the artifact pasted.
3. **The GAP** — the acceptance items that still have no proof, numbered. This is the work contract.
4. **ALREADY PROVEN** — what the principal measured personally, each item with its proof (command + output). The subagent does not re-test any of it; it may at most contest with new evidence. Re-proving existing evidence is the largest source of hours lost.
5. **Known environment traps** of this harness (e.g. prefer `curl.exe` over `Invoke-WebRequest` on Windows, pass JSON bodies from a file, `.ps1` saved as UTF-8 with BOM, a local database already running — reuse it, do not raise another).

Forbidden in the briefing: pasted artifact content (ticket, schema, plan, contract), "read all of X" for anything over ~20 KB, narrative/history/repetition of the execution plan, more than ~80 lines total. If the briefing does not fit, the spawn's scope is wrong: split the work.

## The acceptance flow (the agent is the user)

The ONE acceptance test is the real user flow, executed by the AGENT with the full browser tool: open the real URL, sign in with the test credential (from a project file or env variable — the value is never echoed into chat or logs), click, fill, land where the flow says, read the outcome in the DOM, and screenshot every key step. A clean console on the new screen is part of GREEN — a console error is a finding. **The agent uses the app; the human is not a tester.**

Forbidden by default: generic batteries (mass invalid cases, byte-by-byte schema re-checks, re-proving what is already measured, bypass probes with no new route). They enter only against direct money, session, or silent-data risk. The cost of a test never exceeds the cost of building what it tests.

If the full browser tool is unavailable in some environment: extract the repo's own CDP driver, once, and drive the same ops through it. The skill NEVER instructs an operation the tool cannot execute — the briefing states the real workaround, never an impossible instruction.

## Per-ticket loop

Follow the phases and the parallelism from `06-plano-de-execucao.md`; the loop type recorded there (a fresh agent per attempt, or the same builder/qa/evaluator carrying the ticket) is the one to run — do not switch it mid-build without asking.

1. **Pick the ticket** in `status: active` whose dependencies are all `done` (or human-accepted). Set `status: in_progress` (`edit` the frontmatter — the Kanban tab shows it).
2. **Assemble context** and spawn **builder** with the ticket path. Builder reports files + build output.
3. **Spawn qa-tester**: write/extend tests for the ticket's "Done when" (typecheck, unit, regression, flow). RED → findings go back to the **builder** (same ticket, `status: in_progress` again). GREEN with evidence → advance.
4. **Spawn evaluator**: "does the diff match the ticket's requirements AND the epic artifacts?" GREEN → set `status: human_test` (queued for the owner's end-of-epic batch — not an invitation to test now). RED → mismatch list goes back to builder/qa.
5. **No human mid-epic.** No intermediate proofs, no test scripts sent, no "go try it" per ticket. The principal publishes what passed the real flow and moves to the next ticket. The human tests exactly ONCE: when the LAST ticket closes — they get the link and use the whole app as a consumer, on their phone. No tables, no reports. Only then does final acceptance happen, and only there does anything move to `done` (whole-product acceptance, never per-piece). A rejected piece returns to the builder with the exact step that broke; two identical episodes in a row = escalate with `ask_user_question`.
6. Next ticket. Two consecutive rounds with the **same** finding = stall: stop and escalate with `ask_user_question`.

## Round rules

- A round is builder pass **plus** qa pass — never a critic alone; qa finding nothing on unchanged work is a second opinion, not a round.
- Never relax a ticket's "Done when" to make a round pass. Changing it is a decision for the requester, recorded in the ticket.
- The evaluator checks **against the artifacts**, not against the builder's intentions. Traceability: every "Done when" item maps to a test or to declared manual QA.
- Budget: cap rounds per ticket up front (default 5). An unbounded loop burns trust and tokens.
- **Time budget with a cut**: a subagent with no on-disk progress (a new or altered file, an updated log) for ~40 minutes is treated as stalled — interrupt it and respawn one that inherits what is on disk. A `running` status alone is not progress; the heartbeat exists to give this signal on every beat.
- **The QA attacks the GAP**: its briefing declares ALREADY PROVEN with the proof of each item. QA does not re-test the proven — it attacks the GAP and tries to break exactly there. A QA spending most of its time reproducing existing proof signals a wrong briefing: the principal wasted the time, not the QA.
- **Tests are functional first.** QA proves the ticket's "Done when" works end to end — and stops there. No speculative suites hunting defects nobody asked for, no edge-case matrices beyond the contract, no nitpicking refactors of working code. Findings that can wait (hardening, coverage breadth, style) are recorded as deferred in the ticket and never block the loop. If the application works as specified, it is GREEN.
- **Speed is the loop's metric.** Audits, tests and rounds optimize for the shortest path to GREEN; what can be done later is deferred, not done now.
- Report honestly at the end: rounds, findings raised/resolved, criteria unmet. "3 criteria still unmet" is a useful result; a false "done" is worthless.

## Evidence rules

- **A builder's suite passing is not a QA run.** It is a second opinion on unchanged work. The qa-tester writes its own adversarial tests and tries to break the work, not confirm it. In one epic the builder's 81 assertions passed and the independent QA still found a security defect the suite never touched.
- **Every UI delivery needs a real-browser screenshot.** That is exactly the defect three code audits missed and one print caught in minutes.
- **Mandatory in the matrix:** route bypass (percent-encoding, case, doubled slashes, `..`), path traversal, forged/expired/`alg`-swapped tokens, missing/extra fields, wrong types, and sensitive-field leakage on **every** route.
- **Agent evidence is a claim until the principal measures.** The principal personally checks each ticket's highest-risk item with its own command before accepting. When the local environment cannot produce the proof, the proof comes from the real environment: deploy and read the real log / the real URL.
- **Command success is not behavioural proof.** A passing build does not prove the container starts. Measure "before" and "after" with the same independent script when one exists.
- **Instrument error ≠ product error.** Before reporting a defect, confirm the tool is not the cause; reproduce with a second tool when the result is strange. On Windows prefer `curl.exe` for HTTP and pass JSON bodies from a file (`--data-binary @file`), not inline. When testing a rate-limiter or shared state, use a **new value per case**.
- **Closing hygiene is mandatory.** Any subagent that raised a server, browser or database ends with: the process killed by whoever owns the port, the disposable database deleted, and a printed confirmation (port free + database removed). Leftovers are the agent's failure, not the environment's — an orphaned leftover hijacks the next agent's work.
- **The publish gate**: production deploy happens only with QA GREEN that includes a real-browser proof of the delivered flow. A GREEN suite does not authorize publishing: a delivery can pass hundreds of assertions and still be unusable under real navigation.

## Escalation

Anything the loop cannot settle (ambiguous ticket, conflicting artifacts, missing decision, stalled rounds) → `ask_user_question` with concrete options as consequences. Autonomy is not a licence to guess on a decision the requester owns.

## Close-out

When all tickets are `human_test`/`done`: hand to `/08-review` for the final verification and honest walkthrough.
