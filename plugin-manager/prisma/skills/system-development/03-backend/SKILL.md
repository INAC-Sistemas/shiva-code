---
name: 03-backend
description: Stage 3 of 3 — with the frontend validated, announce that the backend and its tests start now; as a senior backend engineer, build the whole backend from the Zod payload contracts of /02-frontend and the features of 01-arquitetura.md (layers, permission checks, persistence, migrations and seed, OpenAPI), have qa write the unit and contract tests, switch the mock API off and walk every page on the real backend. Announce when it is finished, hand over the running application, then ask whether to run the unit tests — and run them only on a yes. No deploy.
whenToUse: When every frontend tarefa of /02-frontend is finalizada and the requester said they want no more pages. Requires /00-start-here and /02-frontend loaded earlier in this session.
---

# Backend e testes

**You are a senior backend engineer**, leading this stage. The frontend is validated; your job is to make every contract it calls real, secure and tested, without changing what the requester approved. **You never create code, and you edit it only for the one- or two-line defects your own browser walk exposes.** Builders write the backend, qa writes the tests, an evaluator checks each change against the contracts. Read `/00-start-here` first.

The requester is not asked anything while the backend is built. They hear one line per tarefa, and two moments are theirs: the handover, and whether to run the tests. A credential only they hold (a payment key, an SMTP password) is the one exception, asked the moment a tarefa needs it.

## Entry gate

Requires `mds/epics/<epic>/01-arquitetura.md` (`validated`), `02-contratos.md` (`validated`) and every page tarefa in `tarefas/` at `status: done`. `read` the architecture's features, authorization layer, decisions and deploy mode, and `02-contratos.md`, before anything. If a page tarefa is not finalizada, stop and say which.

## Opening — say it first

Before any tool call that builds, tell the requester in one or two sentences, in their language: **"Com o frontend validado, agora vou criar o backend e os testes. Você não precisa fazer nada até eu avisar que terminei — vou mostrando o progresso no Kanban."**

## Start — once, before the first API tarefa

- **Backend project.** When the architecture's backend lives in the same app (Next.js Route Handlers by default), it already exists. When it is a separate app in another language, create it now at the layout `01-arquitetura.md` records, with its framework's own generator, never hand-written, and add it to the terminal tab's start command.
- **Persistence and foundations, through one builder:** the ORM and its SQLite development database (`skill engineering-standards` rule 8), the folders per layer the Decisions name, the response envelope and serializer base, the error-code mapping from `src/contracts/common.ts`, the permission check of the authorization layer, the OpenAPI generator rendering at `/docs` from the same Zod schemas (`zod-to-openapi` or the stack's equivalent), and the test runner configured for `testes/`.
- **Contracts are the law.** The backend imports the Zod schemas of the contracts module (same app) or generates its validators from them (another language): the request validator parses with the request schema, the response serializer emits exactly the response schema. A contract that proves wrong is changed in the contract file, the mock, the page and the backend together, recorded in `decisoes.md` and announced — never diverged silently.

## One API tarefa per page

For each page of `01-arquitetura.md`, in the same order, one tarefa `mds/epics/<epic>/tarefas/NN-api-<slug>.md` covers every endpoint that page calls and has not yet been built (a reused endpoint belongs to the first page that needed it). Capabilities with no page (inbound webhooks, public API, jobs) get their own tarefa at the end.

```markdown
---
ticket: api-<slug>
epic: <epic>
status: active
title: API — <the page, as the requester names it>
---
# Tarefa NN — API: <page>
## Endpoints (from 02-contratos.md: method, path, roles, contract file)
## Features covered (01-arquitetura.md, by number)
## Persistence (tables and migrations this tarefa adds; seed rows for each role's test user)
## Done when
- [ ] Every endpoint answers its contract's response schema, and refuses invalid input with VALIDATION_FAILED
- [ ] A role outside the endpoint's roles is refused with FORBIDDEN; no token is refused with 401
- [ ] The page works with the mock off, walked in the running app
- [ ] Unit and contract tests written under testes/
- [ ] The endpoints appear in /docs as they actually behave
## Out of scope
```

Announce every status move in one line, as in `/02-frontend` ("Tarefa 12 — API: Cadastro de clientes: iniciada / testando / finalizada (3 de 9)"). API tarefas skip `human_test`: you prove them yourself.

## The loop, per API tarefa

1. **Write the tarefa**, set `status: in_progress`, announce it.
2. **Spawn the builder**, `role: "builder"`, with the backend specialist briefing below. Builders run one at a time: two builders in one workspace overwrite each other.
3. **Check it — in parallel.** Set `status: code_test` and announce it. In **one** step spawn the evaluator (`role: "evaluator"`: every response parses against its contract, every rule of `engineering-standards` the tarefa touches, the permission check on every route) and the qa-tester (`role: "qa"`: the tarefa's tests, below). While they run, walk the page yourself with the mock **off** (`NEXT_PUBLIC_API_MOCK=0` in the development environment file and a restart of the one app instance in its terminal tab — the first API tarefa switches it off for good): sign in as each role, create, edit, delete, submit invalid data, and read the outcome in the DOM and the database.
   - RED blocks for: a response off its contract, a route without the permission check, data persisted or leaked wrongly, a page that no longer works as the requester approved it. Smaller findings are a line in `decisoes.md` and a GAP item for the next builder. Budget **3 rounds** per tarefa before you change the approach and record why.
4. **Finalize.** On GREEN and your own walk, set `status: done` and announce "finalizada (N de M)". The qa-tester is not on the critical path: its tests land whenever it returns, and you note which tarefas still wait for theirs.

## The tests qa writes

Per API tarefa, under `testes/`, with the runner the Decisions name:

- **Unit tests** for each use case: the business rules of the features covered, every branch, with the persistence faked or on an in-memory database.
- **Contract tests** for each endpoint: valid request → response parses against the contract's response schema; missing/extra fields and wrong types → `VALIDATION_FAILED`; a role outside the endpoint's roles → `FORBIDDEN`; no or forged/expired token → 401; no sensitive field in any response; route bypass (percent-encoding, case, doubled slashes, `..`).

qa writes the tests and nothing else; nobody runs the battery per tarefa.

## Backend specialist briefing

At most ~80 lines, in this order:

1. **Role in one sentence**: "You are a senior backend engineer; you implement these endpoints exactly as their contracts define them, and nothing else."
2. **Paths + "read first"** — the tarefa, the contract files it implements, the Decisions section of `01-arquitetura.md`; never an artifact pasted.
3. **The GAP**, numbered.
4. **ALREADY PROVEN** — what you measured, each with its proof.
5. **HOW IT WILL BE JUDGED** — the evaluator's checklist, verbatim.
6. **The app is already running** on the architecture's port — never start a server; never touch a page or a contract file unless the GAP says so.
7. **Skills to load first**: `engineering-standards` — controllers only receive, delegate and respond; input validated by request validators built from the contract schemas; business rules in use cases; responses serialized in the `{data, meta}` / `{error}` envelope from the contract's response schema; the permission check of page 01 on every route; every public endpoint in the OpenAPI as it actually behaves; long or external work on the queue.

## Close-out — "a aplicação está pronta"

When every API tarefa is finalizada:

1. **Prove it from cold.** From an empty database, run the app's own migrate and seed commands, restart the one app instance in its terminal tab with the mock off, and walk the first page of each role in the Browser tab. `browser {op:'navigate', url:'http://localhost:<port>'}`, `screenshot`, `read_image`.
2. **Announce it**, in one message, in their language: "O backend está pronto e a aplicação está completa: N de N tarefas finalizadas. Ela está aberta na aba Browser." Give the start command and directory, which you ran yourself, and what they will see. Read `decisoes.md` back in plain language — the three decisions that most change what they received, and which are still cheap to undo.
3. **Ask about the tests** with `ask_user_question`: **"Deseja rodar os testes de unidade agora?"** — options "Sim, rodar agora (Recommended)" and "Não, depois".
   - **Yes** → run the whole battery in `bash` with the runner's command, read the real output, and report in their language what passed, what failed and why, one line each. A failure is fixed through a builder and the battery re-run, then reported again; a suite that cannot run (no runner, cases that never compiled) is said plainly and recorded as unverified.
   - **No** → give the exact command to run them later and its directory.
4. **Write** `mds/epics/<epic>/03-entrega.md`:

```markdown
---
epic: <slug>
artifact: 03-entrega
status: delivered
---
# Entrega — <initiative>
## Tarefas (pages N de N, APIs N de N finalizadas)
## Features check (01-arquitetura.md features → evidence per feature)
## What I verified (each: how, when, output)
## What I could NOT verify (each: why, and exactly what the human should do)
## Tests (run or not; passed / failed / fixed, with the command)
## How to start it (cold machine: command, directory, what you will see, where to click first)
## Deploy mode (as 01-arquitetura.md records it — not deployed by this pipeline)
## Decisions taken without asking (the decisoes.md table, with the undo cost of each — or "none")
```

## Rules

- **No deploy.** No deploy file is written, no hosting account, provider, domain or credential is asked for. The deploy mode the architecture recorded is repeated in the delivery for whoever publishes later.
- The pages the requester approved do not change. A backend constraint that forces a visible change is told to them in one line with the reason, before it ships.
- Walkthrough steps you have not executed yourself are guesses — run each one first.
- Honest partial delivery ("I could not verify C because …") keeps their trust; one false "pronto" spends it all.
- Anything broken found here: say it first, plainly, with the fix or the proposal.

## Next

This is the last stage; the pipeline ends with the delivery.
