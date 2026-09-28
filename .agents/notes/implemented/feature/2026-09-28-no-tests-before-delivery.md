# Agent Note: no tests before delivery, and visual page approval

Status: implemented

## Problem

In the [three-stage pipeline](2026-09-28-three-stage-pipeline.md) as first shipped, testing ran through both build stages:
- **`/02-frontend`.** The principal walked each page before handing it over: it signed in as every role, submitted invalid forms and checked refusals. It then asked the requester to validate the page's behaviour.
- **`/03-backend`.** A qa subagent wrote unit and contract tests for every API tarefa, and the stage ended by asking whether to run them.

The product owner ruled out both:
- **No test before delivery.** No test is created or run before the application is delivered.
- **Visual approval only.** During the frontend stage the requester approves what a page looks like, not whether it works.
- **Tests on request, later.** After delivery the requester is asked whether they want a test battery implemented for audit. That battery is a later stage that does not exist yet.

## Decision

**No stage writes or runs a test.** There is no test file, test runner configuration, test script or qa subagent anywhere. Builder briefings in both stages say to write no test file and to run no test runner; typecheck and build are the only commands that prove the code compiles.

**The evaluator stays, as a code review.** It reads the diff and judges it against the tarefa, the artifacts, the contracts and `engineering-standards`; it runs nothing. The Kanban's `code_test` column is announced as "em revisão".

**`/02-frontend` asks for a visual approval.**
- A page tarefa's Done-when describes what the page shows. It lists the page's adherence to `02-design.md`, its loading, empty and error states shown from mock fixtures, a responsive layout and its Zod contracts.
- Before handover, the principal only looks at the page: navigate, `wait_stable`, screenshot, comparison with the design, clean console. It clicks through no flow, submits no form and signs in as no role.
- The handover message asks the requester to judge layout, colors, typography, texts, icons and motion. It says the data is sample data and nothing works for real yet.

**`/03-backend` confirms the app runs and asks about tests after delivery.**
- For each API tarefa, the principal confirms that the page loads with the mock off and shows data from the backend. This is a check that the app runs, not a scripted scenario.
- The close-out asks "Deseja que seja implementada uma bateria de testes no sistema para auditoria?".
- The answer is recorded as `testes: solicitado | recusado` in `03-entrega.md`. A yes is not acted on: the test battery stage is not part of the pipeline yet.

`00-start-here`, `01-arquitetura` and `engineering-standards` state the same rule.

## Alternatives considered

**Keep contract tests written during `/03-backend` and only skip running them.** Rejected by the owner: no test is created before the delivery either.

**Keep the principal's functional walk in `/02-frontend` and only change what the requester is asked.** Rejected: the walk was a functional test run before delivery, and against the mock it proved behaviour the backend did not have yet.

## Consequences

- Nothing automated detects a regression between pages or a backend that drifts from its contracts. The evaluator's code review and the principal's check that each page loads are the only guards until the requester asks for the test battery.
- The `qa` role of `dsh-tool-guard` and its `testes/` write surface stay in the plugin but are unused by the pipeline. `testes/` is reserved for the future battery.
- The test battery stage remains to be designed. `03-entrega.md` carries the requester's answer for it.

## Verification

- `node scripts/sync-skills.mjs --check` reports no drift.
- No stage skill tells an agent to write, configure or run a test, or to spawn a qa subagent.
