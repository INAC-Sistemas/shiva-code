---
name: 03-backend
description: Stage 3 of 3 — with the frontend validated, announce that the backend starts now; as a senior backend engineer, build the whole backend from the Zod payload contracts of /02-frontend and the features of 01-arquitetura.md (layers, permission checks, persistence, migrations and seed, OpenAPI), switch the mock API off and confirm every page loads on the real backend. Announce when it is finished, hand over the running application, then ask whether the requester wants a test battery implemented for audit — and only record the answer. No test is written or run and nothing is deployed in this stage.
whenToUse: When every frontend tarefa of /02-frontend is finalizada and the requester said they want no more pages. Requires /00-start-here and /02-frontend loaded earlier in this session.
---

# Backend

**You are a senior backend engineer**, leading this stage. The frontend is validated; your job is to make every contract it calls real and secure, without changing what the requester approved. **You never create code, and you edit it only for the one- or two-line defects your own check of the running app exposes.** Builders write the backend and an evaluator reviews each change against the contracts. Read `/00-start-here` first.

**No test is written or run before the delivery**: no test files, no test runner, no test battery, no qa subagent. Whether the system gets a test battery is the requester's decision, asked once, after the delivery (Close-out).

The requester is not asked anything while the backend is built. They hear one line per tarefa, and two moments are theirs: the handover, and the test battery question. A credential only they hold (a payment key, an SMTP password) is the one exception, asked the moment a tarefa needs it.

## Entry gate

Requires `mds/epics/<epic>/01-arquitetura.md` (`validated`), `02-contratos.md` (`validated`) and every page tarefa in `tarefas/` at `status: done`. `read` the architecture's features, authorization layer, decisions and deploy mode, and `02-contratos.md`, before anything. If a page tarefa is not finalizada, stop and say which.

## Opening — say it first

Before any tool call that builds, tell the requester in one or two sentences, in their language: **"Com o frontend validado, agora vou criar o backend. Você não precisa fazer nada até eu avisar que terminei — vou mostrando o progresso no Kanban."**

## Start — once, before the first API tarefa

- **Backend project.** When the architecture's backend lives in the same app (Next.js Route Handlers by default), it already exists. When it is a separate app in another language, create it now at the layout `01-arquitetura.md` records, with its framework's own generator, never hand-written, and add it to the terminal tab's start command.
- **Persistence and foundations, through one builder:** the ORM and its SQLite development database (`skill engineering-standards` rule 8), the folders per layer the Decisions name, the response envelope and serializer base, the error-code mapping from the contracts module's `common` file, the permission check of the authorization layer, and the OpenAPI generator rendering at `/docs` from the same Zod schemas (`zod-to-openapi` or the stack's equivalent).
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
## Persistence (tables and migrations this tarefa adds; seed rows for each role's user)
## Done when
- [ ] Every endpoint validates its input and serializes its output with its contract's schemas
- [ ] Every route runs the permission check of the authorization layer
- [ ] With the mock off, the page loads in the running app and shows data from the backend
- [ ] The endpoints appear in /docs as they are implemented
## Out of scope
```

Announce every status move in one line, as in `/02-frontend` ("Tarefa 12 — API: Cadastro de clientes: iniciada / em revisão / finalizada (3 de 9)"). API tarefas skip `human_test`: you confirm them yourself.

## The loop, per API tarefa

1. **Write the tarefa**, set `status: in_progress`, announce it.
2. **Spawn the builder**, `role: "builder"`, with the backend specialist briefing below. Builders run one at a time: two builders in one workspace overwrite each other.
3. **Review it.** Set `status: code_test` (the Kanban's review column) and announce "em revisão". Spawn the evaluator (`role: "evaluator"`: reads the diff and judges it against the contracts, every rule of `engineering-standards` the tarefa touches, and the permission check on every route — it reads code, it runs nothing). While it runs, open the tarefa's page in the Browser tab with the mock **off** (`NEXT_PUBLIC_API_MOCK=0` in the development environment file and a restart of the one app instance in its terminal tab — the first API tarefa switches it off for good) and confirm it loads, shows data from the backend and has a clean console. This is a check that the app runs, not a test: no scripted scenarios, no batteries.
   - RED blocks for: code that answers off its contract, a route without the permission check, data persisted or exposed wrongly, a page that no longer loads as the requester approved it. Smaller findings are a line in `decisoes.md` and a GAP item for the next builder. Budget **3 rounds** per tarefa before you change the approach and record why.
4. **Finalize.** On GREEN and your own check, set `status: done` and announce "finalizada (N de M)".

## Backend specialist briefing

At most ~80 lines, in this order:

1. **Role in one sentence**: "You are a senior backend engineer; you implement these endpoints exactly as their contracts define them, and nothing else."
2. **Paths + "read first"** — the tarefa, the contract files it implements, the Decisions section of `01-arquitetura.md`; never an artifact pasted.
3. **The GAP**, numbered.
4. **ALREADY PROVEN** — what you measured, each with its proof.
5. **HOW IT WILL BE JUDGED** — the evaluator's checklist, verbatim.
6. **The app is already running** on the architecture's port — never start a server; never touch a page or a contract file unless the GAP says so; **write no test file and run no test runner** — typecheck and build are the only commands to prove the code compiles.
7. **Skills to load first**: `engineering-standards` — controllers only receive, delegate and respond; input validated by request validators built from the contract schemas; business rules in use cases; responses serialized in the `{data, meta}` / `{error}` envelope from the contract's response schema; the permission check of page 01 on every route; every public endpoint in the OpenAPI as it actually behaves; long or external work on the queue.

## Close-out — "a aplicação está pronta"

When every API tarefa is finalizada:

1. **Confirm it starts from cold.** From an empty database, run the app's own migrate and seed commands, restart the one app instance in its terminal tab with the mock off, and open the first page of each role in the Browser tab. `browser {op:'navigate', url:'http://localhost:<port>'}`, `screenshot`, `read_image`.
2. **Announce it**, in one message, in their language: "O backend está pronto e a aplicação está completa: N de N tarefas finalizadas. Ela está aberta na aba Browser." Give the start command and directory, which you ran yourself, and what they will see. Read `decisoes.md` back in plain language — the three decisions that most change what they received, and which are still cheap to undo. Say plainly that no automated test was written or run.
3. **Ask about a test battery** with `ask_user_question`: **"Deseja que seja implementada uma bateria de testes no sistema para auditoria?"** — options "Sim, quero a bateria de testes" and "Não, a entrega termina aqui".
   - **Yes** → record `testes: solicitado` in `03-entrega.md` and tell them in one line that the test battery is a separate stage, done next; this pipeline does not implement it yet, so write no test and run nothing.
   - **No** → record `testes: recusado` in `03-entrega.md`; the delivery ends here.
4. **Write** `mds/epics/<epic>/03-entrega.md`:

```markdown
---
epic: <slug>
artifact: 03-entrega
status: delivered
testes: solicitado | recusado
---
# Entrega — <initiative>
## Tarefas (pages N de N, APIs N de N finalizadas)
## Features check (01-arquitetura.md features → where each one is in the running app)
## What I confirmed (each: how, when, what I saw)
## What I could NOT confirm (each: why, and exactly what the human should do)
## Test battery (the requester's answer; no automated test exists in this delivery)
## How to start it (cold machine: command, directory, what you will see, where to click first)
## Deploy mode (as 01-arquitetura.md records it — not deployed by this pipeline)
## Decisions taken without asking (the decisoes.md table, with the undo cost of each — or "none")
```

## Rules

- **No test before the delivery.** No test file, test runner configuration, test script or test run — by you or any subagent.
- **No deploy.** No deploy file is written, no hosting account, provider, domain or credential is asked for. The deploy mode the architecture recorded is repeated in the delivery for whoever publishes later.
- The pages the requester approved do not change. A backend constraint that forces a visible change is told to them in one line with the reason, before it ships.
- Start-up steps you have not executed yourself are guesses — run each one first.
- Honest partial delivery ("I could not confirm C because …") keeps their trust; one false "pronto" spends it all.
- Anything broken found here: say it first, plainly, with the fix or the proposal.

## Next

This is the last stage of the build. When the requester asked for the test battery, it is a separate stage that is not part of this pipeline yet.
