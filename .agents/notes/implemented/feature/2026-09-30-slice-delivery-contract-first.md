# Agent Note: team delivers slices, contracts first, with a labeled preview

Status: implemented

## Problem

The `team` preset ([agent preset roles](../architecture/2026-09-29-subagent-agent-preset-roles.md)) delivered one page at a time, strictly in series: backend, then frontend, then tester, then the project manager's look, then the requester's approval, and only then the next page. A page carried up to 8 "Done when" lines, so the requester waited for three agents in a row before seeing anything, and gave feedback only when a fix cost the most. The architecture interview also asked every E and F question before the first line of code.

## Decision

- **The tarefa is a slice.** A slice is one behaviour the requester can see and use, with at most 3 "Done when" lines. `pm-architecture` lists each page's slices (`NN.x`) under the page. Tarefas, test folders and preview screenshots are named `NN.x-slug`. The kanban statuses are unchanged.
- **Contracts first, then parallel build.** The backend delivers a slice in two phases. Phase 1 publishes the Zod contracts and typed client functions. Phase 2 builds persistence and endpoints. As soon as phase 1 arrives, the project manager sends phase 2 to the backend and the slice to the frontend in the same step, and the frontend builds on the contracts while the endpoints come up. There is still no mock API: the frontend runs the screen on the real API, and runs it again when the project manager reports that the endpoints are up. The critical path per slice goes from `backend + frontend + tester` to `contracts + max(backend, frontend) + tester`.
- **Labeled preview.** The frontend saves a screenshot under `mds/epics/<epic>/previas/`. The project manager shows it to the requester as "prévia — ainda em teste" while the tester runs, and asks for nothing. A remark on the preview becomes a "Done when" line and follows the failure routing. Approval and "pronto" still require the tester's `pass` and the project manager's own look.
- **Navigable shell first.** The frontend foundations render every page of the architecture as a route with its empty state, and that shell is the first preview.
- **Questions at the slice that needs them.** In `rapido` mode, the interview takes at most two `ask_user_question` calls. It asks only what decides roles, data, pages, stack and deploy. Every other E/F item goes to a `Deferred questions` table with the slice that asks it, and `pm-page-loop` asks it when that slice's tarefa is written.
- **Light pipeline.** At most two slices are open: one building or testing, and one in `human_test`. The next slice starts when the previous one reaches `human_test`. Each page keeps one backend and one frontend agent for all of its slices and fixes.

## Alternatives considered

- **Tester writes the suite while the developers build.** It would shorten the path further, but the tester's `delegate_tester` row is one-shot and blocking. Deferred until the verdict can arrive as a background notice.
- **Preview only after `pass`.** It keeps the old rule but loses the earliest feedback, which the requester asked for.

## Consequences

- The skill texts, the `team` persona and the delegation tool descriptions (CLI and desktop presets) now describe slices and the two-phase backend. No plugin or config structure changed.
- Adjustments on a slice in `human_test` go to agents that may already be building the next slice of the same page. Those agents receive both as `send_message` requests, in order.
