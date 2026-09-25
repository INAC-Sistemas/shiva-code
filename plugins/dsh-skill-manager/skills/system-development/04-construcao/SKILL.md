---
name: 04-construcao
description: Build the real system screen by screen, right away — there is no prototype and no upfront breakdown. Each screen is one tarefa, written when it starts, carrying its real frontend (React + Tailwind + shadcn/ui) and the real backend it needs. The principal agent NEVER writes code; per tarefa it spawns a builder, a qa-tester and an evaluator, walks the screen itself in the Browser tab, then hands the screen to the requester and waits — they validate it in the chat or ask for adjustments, and only after their "aprovado" is the tarefa finalizada and the next screen started. Every status move is announced in one line; the system is ready when every tarefa is finalizada.
whenToUse: When 03-plano.md is validated and it is time to build. Requires /00-start-here and /03-plano loaded earlier in this session.
---

# Construção (tela a tela)

You are the principal. **You never create or edit code.** You read context, write each tarefa, spawn subagents, judge evidence, and put every finished screen in front of the requester for validation. Read `/00-start-here` first.

The system is built for real from the first screen: the frontend the requester validates is the frontend that ships, and the data it shows comes from the real backend and database. There is no mock stage to translate later.

## Entry gate

Requires `mds/epics/<epic>/03-plano.md`, `03-palette.md` and `03-design.md`, plus the validated `01-brief.md` and `02-flows.md`. `read` the plan before anything: it carries the stack, the layout, the fixed port, the authorization decisions and **the order of the screens**. If it is missing or not `status: validated`, stop and report.

## Start — once, before the first screen

**Project root.** Make sure the project exists at the workspace root, beside `mds/`, in the layout `03-plano.md` records. Create what is missing yourself, through the shell — running a generator is setup, not hand-written code, and the guard denies `pnpm install` to builders:

- the backend with its framework's own generator, never hand-written; when the generator refuses a non-empty folder, generate into a temporary folder and move it to the root without overwriting, as `skill shadcn-ui` step 1 does;
- the React + Tailwind frontend with `skill shadcn-ui` step 1, using the template, base, preset and frontend folder the plan records, then `pnpm add` in that folder for the packages the plan records (icon pack, `motion`, `@fontsource` fonts, query library). A builder that later needs a package reports it and you install it.
- the theme from `03-palette.md` and the fonts and motion tokens from `03-design.md` go into the theme CSS now, through a builder, so the first screen is already on brand.

Confirm `components.json` and a passing build of every part before the first tarefa. No Docker file is created here (`skill engineering-standards` rule 7). Never wrap the whole project in one extra folder.

**The app stays up, and the preview is open.**

1. `terminal_create` opens a terminal tab the requester can watch, in the workspace root.
2. `terminal_send` starts the app on the **fixed port `03-plano.md` records**, and `terminal_wait_for` waits for its ready line — never a `sleep`, never a polling loop.
3. `browser {op:'open', url:'http://localhost:<port>'}`, then `browser {op:'screenshot'}` and `read_image` to confirm a real page is on screen.
4. Say it once, in one line, in their language: the port, and that each screen will appear there and wait for their validation before the next one starts.

A preview that cannot open — tab closed or under 50px, `browserFullAccess: false` in the harness settings.yaml — is reported in one line with the real reason; without it the requester validates from your screenshots.

**No subagent raises a server.** A builder or evaluator that needs the app uses the instance already up; if it looks dead, it says so and you restart it. One epic burned 71 app starts, 36 process kills and 99 `flock` calls across six different ports because every agent raised its own. Use a terminal tab, never a background job: a job dies when the session is discarded.

## One screen = one tarefa

Screens are built **one at a time, in the order of `03-plano.md`** — never two at once, never the next before the current one is validated. Screen 01 is the Authorization Layer whenever anyone signs in.

A tarefa is written **when its screen starts**, never in advance: `mds/epics/<epic>/tarefas/NN-<slug>.md`, about 200 words, short and objective.

```markdown
---
ticket: <slug>
epic: <epic>
status: active
title: <the screen, as the requester names it>
---
# Tarefa NN — <screen>
## Screen (one sentence: what the user does here)
## Roles (who reaches it; everyone else is refused)
## Flow steps covered (02-flows.md, by flow and step number)
## Backend (routes, request validator, use case, response serializer, migration and seed this screen needs — or "none")
## Done when
- [ ] <the flow step walked in the running app → what is seen>
- [ ] <the backend outcome: what is persisted or refused>
- [ ] A role outside "Roles" is refused
- [ ] Loading, error and empty states shown
## Out of scope
## Validation (the requester's words at each round)
```

The frontmatter key `ticket:` is the Kanban's internal id; the word the requester reads is always **tarefa**.

## Every tarefa is announced

**Every status you write is announced in the same reply, in one line, in their language** — never a move without its line, never a line without its move:

| Move | `status:` written | The line |
|---|---|---|
| the screen starts | `in_progress` | "Tarefa 03 — Cadastro de clientes: iniciada." |
| the builder returned and the checks start | `code_test` | "Tarefa 03 — Cadastro de clientes: testando." |
| the checks passed and it is theirs to see | `human_test` | "Tarefa 03 — Cadastro de clientes: pronta para sua validação." |
| they asked for adjustments | `in_progress` | "Tarefa 03 — Cadastro de clientes: em ajuste — <what they asked, in a few words>." |
| they approved | `done` | "Tarefa 03 — Cadastro de clientes: finalizada (3 de 9)." |

The Kanban shows the same statuses as A fazer, Iniciada, Testando, Em validação and Finalizada.

## The loop, per screen

1. **Write the tarefa**, set `status: in_progress`, announce it.
2. **Spawn the builder**, `role: "builder"`: it builds the screen and the backend it needs — frontend and backend in the same tarefa — and reports files + build output.
3. **Check it before they see it.** Set `status: code_test` and announce it. Spawn the qa-tester (`role: "qa"`) to write the tarefa's tests under `testes/` (run as one battery in `/05-revisao`). Walk the screen yourself in the Browser tab as the acceptance flow below describes. Spawn the evaluator (`role: "evaluator"`) to judge the diff against the tarefa, the brief, the flows and `03-plano.md`. RED goes back to the builder with the exact mismatch list; budget 5 rounds per screen before you change the approach (the scope, the decomposition, the agent) and record why.
4. **Hand it over.** On GREEN, set `status: human_test`, `browser {op:'navigate'}` to the screen, `screenshot`, `read_image`, announce it, and ask for validation in plain language: what the screen does, where to click, which role to sign in as (the test credential lives in a project file or environment variable — never echoed). In the same message, put any question this screen raised that only they can answer, and any credential only they hold. Then **end the turn and wait** — no next screen is started, spawned or written while this one waits.
5. **They ask for adjustments** → write their words into the tarefa's `## Validation`, set `status: in_progress`, announce "em ajuste", and go back to step 2 with those words as the builder's gap. Their rounds have no budget: the screen is theirs.
6. **They approve** ("aprovado", "pode seguir", or an unmistakable equivalent) → write it into `## Validation`, set `status: done`, announce "finalizada (N de M)", and start the next screen at step 1. The first approval also sets `03-design.md` to `status: validated`. Anything short of an explicit approval is not one — ask.

A screen may change what the brief, the flows or the plan said: `edit` those artifacts in the same reply, so they keep describing the system that exists.

## The triad

| Subagent | May do | May NOT do | Returns |
|---|---|---|---|
| **builder** | `write`/`edit` code for the tarefa scope only; build and typecheck with `bash` | touch `status:`, widen scope, **start a server** | files changed + commands run + outputs |
| **qa-tester** | **write the tarefa's tests, and nothing else** (`write`/`edit` under `testes/` and the test-runner configs) | edit product code, run the suite | the test files written, and what each asserts |
| **evaluator** | `read` the tarefa, the epic artifacts and the diff; judge match | edit anything | GREEN or RED with the exact mismatch list |

Spawn with the `subagent` tool, always passing `role` (`builder`, `qa` or `evaluator`) — the guard binds the child's write surface to it. Evaluators always `read` the artifacts themselves — never trust your summary, never trust the builder's. **The guard is active**: `dsh-tool-guard` limits your own `write`/`edit` to `mds/` and the product as a fast-fix window; a builder writes the product; qa writes `testes/` and the test-runner configs; an evaluator writes nothing; `status: done` is yours alone, and only after their approval. A write you expected to succeed coming back denied is the law, not a bug — delegate it.

## Spawn briefing

The briefing consumes the subagent's context window; a long briefing kills the agent before its first file. Every spawn contains, in this order:

1. **Role in one sentence.**
2. **Paths + "read first"** — the tarefa path plus only the excerpts the agent needs, never an artifact pasted.
3. **The GAP** — the "Done when" items and the requester's adjustment words that still have no proof, numbered.
4. **ALREADY PROVEN** — what you measured personally, each with its proof. The subagent does not re-test it.
5. **HOW IT WILL BE JUDGED** — the evaluator's checklist, verbatim: every "Done when" line plus the `engineering-standards` items it touches.
6. **The app is already running** on the plan's port — never start a server.
7. **Known environment traps** (`curl.exe` over `Invoke-WebRequest` on Windows, JSON bodies from a file, a local database already running — reuse it).

**Every tarefa has a screen**, so every builder briefing adds: "Load the `shadcn-ui`, `ui-icons`, `ui-palette`, `frontend-design` and `baseline-ui` skills first — plus `react-ui-patterns` when the screen loads or mutates data, and `tailwind-patterns` when the tarefa touches the theme CSS; build every standard control from shadcn/ui components added with its CLI, take every icon from the pack `03-plano.md` records, every color from the theme variables set from `03-palette.md`, and fonts and motion tokens from `03-design.md`." **A tarefa with a backend** also adds: "Load the `engineering-standards` skill and follow it: controllers only receive, delegate and respond, input validated by request validators, business rules in use cases, responses serialized in the `{data, meta}` / `{error}` envelope, every public endpoint documented in the API specification as it actually behaves, the permission check of screen 01 on every route, long or external work on the queue." The evaluator's briefing loads `engineering-standards`, `fixing-accessibility` and `fixing-motion-performance` in review mode and applies their RED lists: a hand-written control a shadcn component covers, a hand-written SVG or emoji the icon pack covers, a color literal outside the theme CSS, a screen without the motion of `03-design.md`, a missing loading/error/empty state, a critical accessibility violation, a route without the permission check.

Forbidden in the briefing: pasted artifact content, "read all of X" for anything over ~20 KB, more than ~80 lines total. If it does not fit, the scope is wrong: split the screen.

## The acceptance flow (you are the first user)

Before any screen reaches the requester, you walk it with the full browser tool: open the real URL, sign in with the test credential, click, fill, land where the flow says, read the outcome in the DOM, and screenshot the key steps. A clean console is part of GREEN. Generic batteries (mass invalid cases, byte-by-byte schema re-checks, re-proving what is measured) enter only against money, session or silent-data risk.

## Evidence rules

- **A builder's own checks are not the proof.** The proof is your pass through the real screen, then theirs.
- **Every screen handed over has a real-browser screenshot you looked at.**
- **Mandatory in the written tests:** route bypass (percent-encoding, case, doubled slashes, `..`), forged/expired tokens, a role outside the tarefa's roles, missing/extra fields, wrong types, sensitive-field leakage on every route.
- **Command success is not behavioural proof.** A passing build does not prove the screen works.
- **Instrument error ≠ product error.** Confirm the tool is not the cause before reporting a defect.
- **Closing hygiene**: any subagent that raised a process ends with it killed and a printed confirmation.

## The decision ledger — `04-decisoes.md`

Technical decisions you take alone — a library, an approach the plan did not settle, a workaround — are written to `mds/epics/<epic>/04-decisoes.md` and announced in one line, in the same reply. Questions that change what the requester receives are not decisions to take alone: they go into the next validation message.

```markdown
---
epic: <slug>
artifact: 04-decisoes
status: em-andamento
---
# Decisions taken during the build — <initiative>

| # | When | Tarefa | What came up | What I decided | Why | What it changes for you | Undo cost |
|---|---|---|---|---|---|---|---|
```

## Close-out

**The system is ready only when every tarefa is finalizada** (`status: done`, each one approved by the requester). Say it in one line with the count ("9 de 9 tarefas finalizadas — o sistema está pronto"), read `04-decisoes.md` back in plain language, and hand to `/05-revisao`.

## Next

When every tarefa is finalizada, load `/05-revisao` with the `skill` tool. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
