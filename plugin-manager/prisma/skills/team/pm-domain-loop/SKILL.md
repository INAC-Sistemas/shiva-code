---
name: pm-domain-loop
description: "Project manager, stage 2 — build the system one domain at a time through the team: choose the palette, delegate the foundations (identity and access only) and show the navigable shell, then for each domain of the domain map run a question session with the requester on every object it keeps — its information, life cycle, permissions per role, restrictions and relations — record it in the domain document with the domain's slices, and deliver each slice: contracts first, backend (with the domain's migration), frontend and test suite in parallel, a labeled preview while the tester runs, failures routed to the developer who built that side, and the requester's approval while the next slice is already building."
whenToUse: "After 01-arquitetura.md is validated. Requires /pm-start-here and /pm-architecture loaded earlier in this session."
roles: [pm]
---

# Domain loop

The system is built one domain of `01-arquitetura.md`'s domain map at a time, in its build order. Each domain opens with a question session on the objects it keeps, and then its slices go through the slice loop below. A slice is one behaviour the requester can see and use — "listar agendamentos", "criar agendamento" — with its data, its screen and its tests, and at most 3 "Done when" lines. Asking about a domain just before building it keeps the questions small and the answers fresh, and small slices make the requester see something working every few minutes and correct it while it is still cheap.

## Work in batches

Every step is one model round trip of several seconds, and in measured runs model time was about 70% of the total while 70–85% of steps carried a single call. Fewer, fuller steps are what make a slice fast:

- Read every file you need in one step.
- Send every delegation and `send_message` that does not depend on another agent's answer in the same step, together with the tarefa edits that record them.
- Change an existing file with `edit`, after `read`ing it in this session; `write` only creates files. A `write` over an unread or changed file fails and costs a step.
- Give a call its own step only when the previous answer decides it.

## Before the first domain

1. **Palette.** Ask the requester to choose the palette — the `palette_pick` tool when it is in your catalog, otherwise one `ask_user_question` with three palettes described as moods and colors — and write `mds/epics/<epic>/02-palette.md` with the chosen tokens.
2. **Skeleton.** Write `tarefas/00-fundacao.md` (`status: active`) and delegate phase 1 with `delegate_backend`: "phase 1: skeleton" — the project at the workspace root in the recorded stack and layout with its dependencies, the `check` script, the contracts module and an empty typed API client, and the app running on the recorded fixed port in a terminal tab. Record the returned id as `backend:`, set `status: in_progress`, and end your turn.
3. **Foundations in parallel.** When its notice arrives, in one step:
   - `send_message` the backend "phase 2: foundations" — the database with only the identity and access tables (the user and the role from the Authorization layer) as its first migration, the seed (one user per role), authentication and the role check, the backend base with its OpenAPI at `/docs`. No business object: each domain migrates its own after its session;
   - `delegate_frontend` on the same tarefa: the design direction (`02-design.md` from the palette), the theme CSS variables, and the **navigable shell** — the app shell, the navigation, and every page of the domain map as a route showing its empty state;
   - `delegate_tester` with the tarefa path and the architecture: "write the foundation suite" — the app starts, `/docs` loads, each seed user signs in, every page route answers.
   Record `frontend:` and `tester:` and end your turn. The foundations' agents are not reused for the domains: each domain gets its own backend and frontend.
4. **First preview and test.** When the backend's and the frontend's notices are both in, set `status: code_test` and in one step show the requester the shell as a preview (its screenshot and the address to open) — "prévia — ainda em teste: este é o mapa do sistema, cada assunto será preenchido um de cada vez" — and `send_message` the tester "run". Route failures as below. Set `status: done` on `pass`.

## The domain session

Each domain starts with one question session, before any of its slices. Tell the requester in one sentence which subject comes now and why it comes before the next ones.

1. **Ask about every object of the domain**, in the requester's words and never with technical terms ("o que o sistema precisa guardar sobre um agendamento?", not "quais atributos da entidade?"):
   - **Information** — what the system records about it, which of it is mandatory, what can never repeat, and a real example.
   - **Life cycle** — the states it goes through ("agendado → confirmado → concluído ou cancelado"), what moves it from one to the next and who does it, and whether it is ever deleted or only cancelled or archived.
   - **Permissions** — for each role of the Authorization layer: whether it sees all of them or only its own, and whether it creates, changes (what, and in which state) and deletes them.
   - **Restrictions** — what must never happen: conflicts, limits, deadlines, values ("dois agendamentos no mesmo horário para o mesmo barbeiro", "cancelar com menos de 2 horas").
   - **Relations** — with the other objects of this domain and of earlier domains: how many of each, whether it is mandatory, and what happens to it when the other one is removed.
   Add the architecture's Deferred questions that name this domain, and the E items that concern its objects (history, notifications, export). Every question carries a recommendation built from the architecture, the earlier domains' answers and how similar businesses work (`web_search` when you do not know). Put every independent question in one `ask_user_question` call; a second call only for what the answers opened. At most two calls per domain.
2. **Write the domain document** `mds/epics/<epic>/dominios/NN-slug.md` (`NN` from the domain map):

   ```markdown
   ---
   epic: <slug>
   domain: <NN — domain name>
   status: draft
   ---
   # NN — <domain>
   ## Objects (table: object → English code name → information it keeps, in plain words, each with its English field name → mandatory → never repeats)
   ## Life cycle (per object with states: state → what moves it → who)
   ## Permissions (table: object → role → sees (all / own) → creates → changes → deletes)
   ## Rules (R1, R2…: the restriction in their words → Given/When/Then → what the person sees when refused)
   ## Relations (table: object → object → how many → mandatory → when the other is removed)
   ## Slices, in build order (table: NN.x | behaviour | roles | objects | rules it enforces)
   ## Answers (question → answer, in their words)
   ```

   Every object, field, state and route gets its English code name here, from the domain map's glossary or chosen now and added to it (`skill engineering-standards` rule 10): the agents code only with these names, and the requester's words stay in the screen copy.

   The first slice is what the domain's first page shows, including its empty state; each later slice adds one thing the person can do (create, change, cancel, filter, export). Each rule belongs to exactly one slice: the first one in which the refused action exists.
3. **One approval.** Present the domain in one message, in their language: what the system keeps, who may do what, the rules as "nunca acontece: …", and the slices in order. Ask once with `ask_user_question` ("Aprovado" / "Quero ajustar"), fold any correction into the document, and set `status: validated` only on their explicit yes.
4. **Keep the map true.** When the answers add, remove or rename an object, a page or a relation between domains, `edit` `01-arquitetura.md` and add a row to `decisoes.md` in the same step. When they change an object of an earlier domain, tell the requester in one sentence what changes in what they already approved, `edit` that domain's document, and put the change in the slice that needs it: the backend adds it as a new migration, and the tester's regression run covers the earlier domain's suites.

## For each slice of the domain

1. **Write the tarefa** `tarefas/NN.x-slug.md` (`NN` the domain, `x` the slice letter from the domain document). When a Deferred question names this slice, ask it now, in one `ask_user_question`, with a recommendation, and record the answer in the tarefa and in `decisoes.md`.

   ```markdown
   ---
   epic: <slug>
   domain: <NN — domain name>
   slice: <NN.x — behaviour>
   route: <the page's English route>
   status: active
   backend:
   frontend:
   tester:
   attempts: 0
   ---
   # NN.x — <behaviour>
   ## Domain document (dominios/NN-slug.md) and the objects this slice touches
   ## Rules it enforces (the R ids from the domain document)
   ## Contracts (each request and response, in plain words)
   ## Done when (at most 3 observable lines; split the slice beyond that)
   ```

2. **Contracts first.** Delegate phase 1 to the backend: `delegate_backend` with the tarefa path, the domain document, the architecture file and the instruction "phase 1: contracts only". The domain's first slice gets a new backend agent, and its phase 2 carries the domain's migration; the domain's later slices go to its recorded one with `send_message`. Write the id to `backend:`, set `status: in_progress`, announce it, and end your turn. Its notice names the contract files.
3. **Build and write tests in parallel.** In one step:
   - `send_message` to the backend id: "phase 2: implement the endpoints for these contracts" — on the domain's first slice, "and the domain's migration and seed";
   - `delegate_frontend` (a new agent for the domain's first slice, `send_message` to the recorded one after that) with the tarefa path, the domain document, the contract files, `02-palette.md`, `02-design.md` and the route;
   - `send_message` to the epic's tester: "write the suite for" the tarefa path, the domain document, the contract files, the route and the seed users.
   Write `frontend:` and `tester:` and end your turn; the notices bring you back.
4. **Wire check.** When the frontend's notice arrives before the backend's, wait for the backend's, then `send_message` the frontend "the endpoints are up: open the route on the real API, fix what differs, and send the screenshot". When the backend's arrived first, the frontend already ran on the real API.
5. **Preview and test, together.** With the backend's and the frontend's notices in, set `status: code_test` and in one step: show the requester the frontend's screenshot and the route as "prévia — ainda em teste", asking nothing, and `send_message` the tester "run". End your turn: its notice ends with the verdict as a JSON block (`status`, and on `fail` the `side`, `evidence` and `failingTests`). When its suite is not written yet, the tester finishes writing first, then runs. Anything the requester says about the preview is written into the tarefa's "Done when" and routed with the failures below.
6. **Route a failure.** On `status: fail`:
   - increment `attempts:` in the tarefa;
   - `send_message` to the id recorded under the verdict's `side` (`backend:` or `frontend:`), with the `evidence` and `failingTests` verbatim, any preview remark for that side, and the instruction to fix the cause and reply when it runs;
   - wait for that agent's notice, then `send_message` the tester "run again" and end your turn.
   When `attempts` reaches 3, stop the loop for this slice: tell the requester in one plain sentence what fails and what you propose, and record it in `decisoes.md`.
7. **Your own look.** On `pass`, open the slice in the running app (the Browser tab when you have it), use its flow once, and fix nothing yourself: anything wrong goes back through step 6 as `side` backend or frontend, decided from what you saw.
8. **Approval, while the next slice builds.** Set `status: human_test`, ask the requester once to use it ("Aprovado" / "Quero ajustar"), and in the same step start the next slice at step 1. When this was the domain's last slice, the next domain's session questions go in that same `ask_user_question` call. An adjustment is written into the approved-pending tarefa's "Done when", routed with `send_message` to that slice's agents, and tested again before the next slice goes to its own test. On "Aprovado", set `status: done` and announce it.

## After the last domain

Ask once whether they want more. A yes adds domains to the architecture's domain map (or objects to an existing domain, with a new session on them) and runs the loop again. A no ends the build: write `mds/epics/<epic>/03-entrega.md` with the start command, the port, the seed users, and what was not verified, following the handover law.

## Rules

- Domains are built in the domain map's order, and a domain's first slice starts only after its document is `validated`.
- At most two slices open: one building or testing, one in `human_test`. A slice starts only after the previous one reached `human_test`.
- A contract published in phase 1 changes only when the backend says so in its notice; forward that change to the frontend in the same step.
- The preview is never called "pronto" and asks for no approval: approval is only on the tested slice.
- Each domain gets its own backend and frontend agents; all of that domain's slices and fixes go to them. The epic has one tester, started with the foundations, and every slice and rerun goes to it.
- You never wait on an agent: after each delegation or `send_message`, do independent work or end your turn.
- Never paste a whole artifact into a delegation: point at the file and state only what is not written there yet.
- You never edit application code, not even to fix a typo the tester found.
