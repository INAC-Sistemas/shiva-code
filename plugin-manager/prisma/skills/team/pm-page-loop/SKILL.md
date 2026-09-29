---
name: pm-page-loop
description: "Project manager, stage 2 — deliver the system page by page through the team: choose the palette with the requester, delegate the foundations, then for each page write its tarefa, delegate its backend, then its frontend, then its tests, route every failure to the developer who built that side, and hand the page to the requester for approval before the next one."
whenToUse: "After 01-arquitetura.md is validated. Requires /pm-start-here and /pm-architecture loaded earlier in this session."
roles: [pm]
---

# Page loop

Every page of `01-arquitetura.md`'s "Pages, in build order" table goes through the same loop, strictly one page at a time. The requester sees a page only after the tester passed it.

## Before the first page

1. **Palette.** Ask the requester to choose the palette — the `palette_pick` tool when it is in your catalog, otherwise one `ask_user_question` with three palettes described as moods and colors — and write `mds/epics/<epic>/02-palette.md` with the chosen tokens.
2. **Foundations.** Write `tarefas/00-fundacao.md` (`status: active`) and delegate it with `delegate_backend`: create the project at the workspace root in the recorded stack and layout, the database with its schema from the data model, the seed (one user per role), the contracts module, the typed API client, the backend base with its OpenAPI at `/docs`, and the app running on the recorded fixed port in a terminal tab. Record the returned id as `backend:` and set `status: in_progress`.
3. When its notice arrives, check the app answers on the port, then delegate the frontend foundations with `delegate_frontend` on the same tarefa: the design direction (`02-design.md` from the palette), the theme CSS variables, the app shell and navigation. Record `frontend:`.
4. Delegate the foundation test with `delegate_tester`: the app starts, `/docs` loads, the seed users sign in. Route failures as below. Set `status: done` on `pass`.

## For each page

1. **Write the tarefa** `tarefas/NN-slug.md`:

   ```markdown
   ---
   epic: <slug>
   page: <NN — page name>
   status: active
   backend:
   frontend:
   attempts: 0
   ---
   # NN — <page>
   ## Features (from 01-arquitetura.md)
   ## Contracts (each request and response, in plain words)
   ## Done when (at most 8 observable lines; split the page into parts beyond that)
   ```

2. **Backend.** `delegate_backend` with the tarefa path, the architecture file, the data it reads and sends, and the fixed port. Write the returned id to `backend:`, set `status: in_progress`, announce it, and end your turn or do independent work until its notice arrives. Its closing message names the endpoints and contract files.
3. **Frontend.** `delegate_frontend` with the tarefa path, the contract files the backend named, `02-palette.md`, `02-design.md`, and the page's route. Write the id to `frontend:` and wait for its notice the same way.
4. **Test.** Set `status: code_test` and call `delegate_tester` with the tarefa path, the page's route and endpoints, the fixed port, and the seed users. It returns the verdict as JSON.
5. **Route a failure.** On `status: fail`:
   - increment `attempts:` in the tarefa;
   - `send_message` to the id recorded under the verdict's `side` (`backend:` or `frontend:`), with the `evidence` and `failingTests` verbatim and the instruction to fix the cause and reply when it runs;
   - wait for that agent's notice, then run step 4 again.
   When `attempts` reaches 3, stop the loop for this page: tell the requester in one plain sentence what fails and what you propose, and record it in `decisoes.md`.
6. **Your own look.** On `pass`, open the page in the running app (the Browser tab when you have it), use its main flow once, and fix nothing yourself: anything wrong goes back through step 5 as `side` backend or frontend, decided from what you saw.
7. **Approval.** Set `status: human_test` and ask the requester, once, to open the page and use it ("Aprovado" / "Quero ajustar"). An adjustment is written into the tarefa's "Done when", routed to the side it concerns with `send_message`, and tested again. On "Aprovado", set `status: done` and announce it.

## After the last page

Ask once whether they want more pages. A yes adds rows to the architecture's page table and runs the loop again. A no ends the build: write `mds/epics/<epic>/03-entrega.md` with the start command, the port, the seed users, and what was not verified, following the handover law.

## Rules

- One page at a time: the next page's backend starts only after the current page is `done`.
- New pages get new backend and frontend agents; fixes for a page always go to that page's recorded agents.
- Never paste a whole artifact into a delegation: point at the file and state only what is not written there yet.
- You never edit application code, not even to fix a typo the tester found.
