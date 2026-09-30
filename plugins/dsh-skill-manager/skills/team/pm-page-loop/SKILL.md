---
name: pm-page-loop
description: "Project manager, stage 2 — deliver the system slice by slice through the team: choose the palette, delegate the foundations and show the navigable shell, then for each slice write its tarefa, get its contracts from the backend first, build backend and frontend in parallel on them, show the requester a labeled preview while the tester runs, route every failure to the developer who built that side, and take the slice to the requester's approval while the next one is already building."
whenToUse: "After 01-arquitetura.md is validated. Requires /pm-start-here and /pm-architecture loaded earlier in this session."
roles: [pm]
---

# Slice loop

Every slice of `01-arquitetura.md`'s "Pages, in build order" table goes through the same loop, in order. A slice is one behaviour the requester can see and use — "listar agendamentos", "criar agendamento" — with its data, its screen and its tests, and at most 3 "Done when" lines. Small slices are what make the requester see something working every few minutes and correct it while it is still cheap.

## Work in batches

Every step is one round trip to the model, several seconds whatever its tools cost, so the number of steps is what decides how long a slice takes. Put every independent call in the same step: read all the files you need at once, apply edits to different files together, and chain related shell commands into one `bash` call (`a && b && c`). Look up with `read`, `grep` and `glob`, never `cat`, `grep` or `ls` inside `bash`: the file tools run in parallel, `bash` runs alone. Give a call its own step only when the previous answer decides it. In a measured run, 85–95% of steps carried a single call and model round trips took two to four times longer than every tool together.

## Before the first slice

1. **Palette.** Ask the requester to choose the palette — the `palette_pick` tool when it is in your catalog, otherwise one `ask_user_question` with three palettes described as moods and colors — and write `mds/epics/<epic>/02-palette.md` with the chosen tokens.
2. **Foundations.** Write `tarefas/00-fundacao.md` (`status: active`) and delegate it with `delegate_backend`: create the project at the workspace root in the recorded stack and layout, the database with its schema from the data model, the seed (one user per role), the contracts module, the typed API client, the backend base with its OpenAPI at `/docs`, and the app running on the recorded fixed port in a terminal tab. Record the returned id as `backend:` and set `status: in_progress`.
3. When its notice arrives, check the app answers on the port, then delegate the frontend foundations with `delegate_frontend` on the same tarefa: the design direction (`02-design.md` from the palette), the theme CSS variables, and the **navigable shell** — the app shell, the navigation, and every page of the architecture as a route showing its empty state. Record `frontend:`.
4. **First preview.** When the frontend's notice arrives, show the requester the shell as a preview (its screenshot and the address to open): "prévia — ainda em teste: este é o mapa do sistema, cada tela será preenchida uma de cada vez". In the same step, delegate the foundation test with `delegate_tester`: the app starts, `/docs` loads, the seed users sign in, every page route answers. Route failures as below. Set `status: done` on `pass`.

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
   attempts: 0
   ---
   # NN.x — <behaviour>
   ## Features (from 01-arquitetura.md)
   ## Contracts (each request and response, in plain words)
   ## Done when (at most 3 observable lines; split the slice beyond that)
   ```

2. **Contracts first.** Delegate phase 1 to the backend: `delegate_backend` with the tarefa path, the architecture file, the data it reads and sends, and the instruction "phase 1: contracts only". The first slice of a page gets a new backend agent; the page's later slices go to its recorded one with `send_message`. Write the id to `backend:`, set `status: in_progress`, announce it, and end your turn. Its notice names the contract files.
3. **Build in parallel.** In one step: `send_message` to the backend id with "phase 2: implement the endpoints for these contracts", and `delegate_frontend` (a new agent for the page's first slice, `send_message` to the recorded one after that) with the tarefa path, the contract files, `02-palette.md`, `02-design.md` and the route. Write `frontend:` and end your turn; both notices bring you back.
4. **Wire check.** When the frontend's notice arrives before the backend's, wait for the backend's, then `send_message` the frontend "the endpoints are up: open the route on the real API, fix what differs, and send the screenshot". When the backend's arrived first, the frontend already ran on the real API.
5. **Preview and test, together.** With both notices in, set `status: code_test` and in one step: show the requester the frontend's screenshot and the route as "prévia — ainda em teste", asking nothing, and call `delegate_tester` with the tarefa path, the route and endpoints, the fixed port and the seed users. Anything the requester says about the preview is written into the tarefa's "Done when" and routed with the failures below.
6. **Route a failure.** On `status: fail`:
   - increment `attempts:` in the tarefa;
   - `send_message` to the id recorded under the verdict's `side` (`backend:` or `frontend:`), with the `evidence` and `failingTests` verbatim, any preview remark for that side, and the instruction to fix the cause and reply when it runs;
   - wait for that agent's notice, then run the tester again.
   When `attempts` reaches 3, stop the loop for this slice: tell the requester in one plain sentence what fails and what you propose, and record it in `decisoes.md`.
7. **Your own look.** On `pass`, open the slice in the running app (the Browser tab when you have it), use its flow once, and fix nothing yourself: anything wrong goes back through step 6 as `side` backend or frontend, decided from what you saw.
8. **Approval, while the next slice builds.** Set `status: human_test`, ask the requester once to use it ("Aprovado" / "Quero ajustar"), and in the same step start the next slice at step 1. An adjustment is written into the approved-pending tarefa's "Done when", routed with `send_message` to that slice's agents, and tested again before the next slice goes to its own test. On "Aprovado", set `status: done` and announce it.

## After the last slice

Ask once whether they want more. A yes adds rows to the architecture's page table and runs the loop again. A no ends the build: write `mds/epics/<epic>/03-entrega.md` with the start command, the port, the seed users, and what was not verified, following the handover law.

## Rules

- At most two slices open: one building or testing, one in `human_test`. A slice starts only after the previous one reached `human_test`.
- A contract published in phase 1 changes only when the backend says so in its notice; forward that change to the frontend in the same step.
- The preview is never called "pronto" and asks for no approval: approval is only on the tested slice.
- Each page gets its own backend and frontend agents; all of that page's slices and fixes go to them.
- Never paste a whole artifact into a delegation: point at the file and state only what is not written there yet.
- You never edit application code, not even to fix a typo the tester found.
