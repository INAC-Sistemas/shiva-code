---
name: pm-page-loop
description: "Project manager, stage 2 — deliver the system slice by slice through the team: choose the palette, delegate the foundations and show the navigable shell, then for each slice write its tarefa, get its contracts from the backend first, build backend, frontend and the test suite in parallel on them, show the requester a labeled preview while the tester runs, route every failure to the developer who built that side, and take the slice to the requester's approval while the next one is already building."
whenToUse: "After 01-arquitetura.md is validated. Requires /pm-start-here and /pm-architecture loaded earlier in this session."
roles: [pm]
---

# Slice loop

Every slice of `01-arquitetura.md`'s "Pages, in build order" table goes through the same loop, in order. A slice is one behaviour the requester can see and use — "listar agendamentos", "criar agendamento" — with its data, its screen and its tests, and at most 3 "Done when" lines. Small slices are what make the requester see something working every few minutes and correct it while it is still cheap.

## Work in batches

Every step is one model round trip of several seconds, and in measured runs model time was about 70% of the total while 70–85% of steps carried a single call. Fewer, fuller steps are what make a slice fast:

- Read every file you need in one step.
- Send every delegation and `send_message` that does not depend on another agent's answer in the same step, together with the tarefa edits that record them.
- Change an existing file with `edit`, after `read`ing it in this session; `write` only creates files. A `write` over an unread or changed file fails and costs a step.
- Give a call its own step only when the previous answer decides it.

## Before the first slice

1. **Palette.** Ask the requester to choose the palette — the `palette_pick` tool when it is in your catalog, otherwise one `ask_user_question` with three palettes described as moods and colors — and write `mds/epics/<epic>/02-palette.md` with the chosen tokens.
2. **Skeleton.** Write `tarefas/00-fundacao.md` (`status: active`) and delegate phase 1 with `delegate_backend`: "phase 1: skeleton" — the project at the workspace root in the recorded stack and layout with its dependencies, the `check` script, the contracts module and an empty typed API client, and the app running on the recorded fixed port in a terminal tab. Record the returned id as `backend:`, set `status: in_progress`, and end your turn.
3. **Foundations in parallel.** When its notice arrives, in one step:
   - `send_message` the backend "phase 2: foundations" — the database with its schema from the data model, the seed (one user per role), authentication and roles, the backend base with its OpenAPI at `/docs`;
   - `delegate_frontend` on the same tarefa: the design direction (`02-design.md` from the palette), the theme CSS variables, and the **navigable shell** — the app shell, the navigation, and every page of the architecture as a route showing its empty state;
   - `delegate_tester` with the tarefa path and the architecture: "write the foundation suite" — the app starts, `/docs` loads, each seed user signs in, every page route answers.
   Record `frontend:` and `tester:` and end your turn.
4. **First preview and test.** When the backend's and the frontend's notices are both in, set `status: code_test` and in one step show the requester the shell as a preview (its screenshot and the address to open) — "prévia — ainda em teste: este é o mapa do sistema, cada tela será preenchida uma de cada vez" — and `send_message` the tester "run". Route failures as below. Set `status: done` on `pass`.

## For each slice

1. **Write the tarefa** `tarefas/NN.x-slug.md` (`NN` the page, `x` the slice letter from the architecture). When the architecture's Deferred questions name this slice, ask them now, in one `ask_user_question`, with a recommendation each, and record the answers in the tarefa and in `decisoes.md`.

   ```markdown
   ---
   epic: <slug>
   page: <NN — page name>
   slice: <NN.x — behaviour>
   status: active
   backend:
   frontend:
   tester:
   attempts: 0
   ---
   # NN.x — <behaviour>
   ## Features (from 01-arquitetura.md)
   ## Contracts (each request and response, in plain words)
   ## Done when (at most 3 observable lines; split the slice beyond that)
   ```

2. **Contracts first.** Delegate phase 1 to the backend: `delegate_backend` with the tarefa path, the architecture file, the data it reads and sends, and the instruction "phase 1: contracts only". The first slice of a page gets a new backend agent; the page's later slices go to its recorded one with `send_message`. Write the id to `backend:`, set `status: in_progress`, announce it, and end your turn. Its notice names the contract files.
3. **Build and write tests in parallel.** In one step:
   - `send_message` to the backend id: "phase 2: implement the endpoints for these contracts";
   - `delegate_frontend` (a new agent for the page's first slice, `send_message` to the recorded one after that) with the tarefa path, the contract files, `02-palette.md`, `02-design.md` and the route;
   - `send_message` to the epic's tester: "write the suite for" the tarefa path, the contract files, the route and the seed users.
   Write `frontend:` and `tester:` and end your turn; the notices bring you back.
4. **Wire check.** When the frontend's notice arrives before the backend's, wait for the backend's, then `send_message` the frontend "the endpoints are up: open the route on the real API, fix what differs, and send the screenshot". When the backend's arrived first, the frontend already ran on the real API.
5. **Preview and test, together.** With the backend's and the frontend's notices in, set `status: code_test` and in one step: show the requester the frontend's screenshot and the route as "prévia — ainda em teste", asking nothing, and `send_message` the tester "run". End your turn: its notice ends with the verdict as a JSON block (`status`, and on `fail` the `side`, `evidence` and `failingTests`). When its suite is not written yet, the tester finishes writing first, then runs. Anything the requester says about the preview is written into the tarefa's "Done when" and routed with the failures below.
6. **Route a failure.** On `status: fail`:
   - increment `attempts:` in the tarefa;
   - `send_message` to the id recorded under the verdict's `side` (`backend:` or `frontend:`), with the `evidence` and `failingTests` verbatim, any preview remark for that side, and the instruction to fix the cause and reply when it runs;
   - wait for that agent's notice, then `send_message` the tester "run again" and end your turn.
   When `attempts` reaches 3, stop the loop for this slice: tell the requester in one plain sentence what fails and what you propose, and record it in `decisoes.md`.
7. **Your own look.** On `pass`, open the slice in the running app (the Browser tab when you have it), use its flow once, and fix nothing yourself: anything wrong goes back through step 6 as `side` backend or frontend, decided from what you saw.
8. **Approval, while the next slice builds.** Set `status: human_test`, ask the requester once to use it ("Aprovado" / "Quero ajustar"), and in the same step start the next slice at step 1. An adjustment is written into the approved-pending tarefa's "Done when", routed with `send_message` to that slice's agents, and tested again before the next slice goes to its own test. On "Aprovado", set `status: done` and announce it.

## After the last slice

Ask once whether they want more. A yes adds rows to the architecture's page table and runs the loop again. A no ends the build: write `mds/epics/<epic>/03-entrega.md` with the start command, the port, the seed users, and what was not verified, following the handover law.

## Rules

- At most two slices open: one building or testing, one in `human_test`. A slice starts only after the previous one reached `human_test`.
- A contract published in phase 1 changes only when the backend says so in its notice; forward that change to the frontend in the same step.
- The preview is never called "pronto" and asks for no approval: approval is only on the tested slice.
- Each page gets its own backend and frontend agents; all of that page's slices and fixes go to them. The epic has one tester, started with the foundations, and every slice and rerun goes to it.
- You never wait on an agent: after each delegation or `send_message`, do independent work or end your turn.
- Never paste a whole artifact into a delegation: point at the file and state only what is not written there yet.
- You never edit application code, not even to fix a typo the tester found.
