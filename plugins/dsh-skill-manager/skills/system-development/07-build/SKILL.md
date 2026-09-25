---
name: 07-build
description: Execute tarefas through subagent orchestration — the principal agent NEVER writes or edits code; it reads context, spawns a builder, a qa-tester (writes the tarefa's test cases without running them) and an evaluator (verifies the work against the tarefa's .md artifacts), proves each tarefa by walking the real flow itself, and keeps the Kanban honest — every status move is announced to the requester in one line (tarefa iniciada, testando, finalizada), and the system is finished only when every tarefa is finalizada. The application goes up in a terminal tab and its preview opens in the Browser tab in the first minute, so the requester watches the system being built. From here the build never stops to ask — every decision it takes alone is announced in one line and appended to mds/epics/(epic)/07-decisoes.md. The test battery belongs to /08-review; the deploy files belong to the publication tarefa, when the brief asked for a container. The execution strategy (loop type, parallelism, phases, failure rule) comes from the validated 06-plano-de-execucao.md, never improvised.
whenToUse: When tarefas from /06-tickets exist and it is time to build. Requires /00-start-here and /06-tickets loaded earlier in this session.
---

# Build (orchestration)

You are the principal. **You never create or edit code.** You read context, sequence work, spawn subagents, judge evidence, and keep the human informed. Read `/00-start-here` first.

## Entry gate

Requires the tarefas from `/06-tickets` **and** a validated `mds/epics/<epic>/06-plano-de-execucao.md`. `read` that plan before spawning anything: it carries the real dependency graph (declared **and** by shared file/symbol), the execution phases, the loop the requester chose, the parallelism, the agent roles, the verification rule and the failure rule. If it is missing or not `status: validated`, **stop and report** — the strategy is the requester's decision, never improvised here.

## Project root

Before the first builder, make sure the project exists **at the workspace root**, beside `mds/` and `prototype/`, in the layout `04-tech-plan.md` records. Create what is missing yourself, through the shell — running a generator is setup, not hand-written code, and the guard denies `pnpm install` to builders:

- the backend with its framework's own generator, never hand-written; when the generator refuses a non-empty folder, generate into a temporary folder and move it to the root without overwriting, as `skill shadcn-ui` step 1 does;
- the React + Tailwind frontend with `skill shadcn-ui` step 1, using the template, base, preset and frontend folder the plan records, then `pnpm add` in that folder for the packages the plan records (icon pack, `motion`, `@fontsource` fonts, query library). A builder that later needs a package reports it and you install it.

Confirm `components.json` in the frontend folder and a passing build of every part before spawning anyone. No Docker file is created here (`skill engineering-standards` rule 7): every tarefa is checked against the app running locally from its framework's own command. Never wrap the whole project in one extra folder.

## The app stays up, and the preview is open from the first minute

Right after the project serves a page, **you** start the application once and put it in front of the requester. Both stay up until the epic ends: the instance is what every check looks at, and the preview is where they watch the system being built.

1. `terminal_create` opens a terminal tab the requester can watch, in the workspace root.
2. `terminal_send` starts the app on the **fixed port `04-tech-plan.md` records** (`pnpm dev`, or the stack's own command), and `terminal_wait_for` waits for its ready line — never a `sleep`, never a polling loop.
3. **Open the preview immediately**: `browser {op:'open', url:'http://localhost:<port>'}`, then `browser {op:'screenshot'}` and `read_image` to confirm a real page is on screen. This happens before the first tarefa, with the framework's starter screen still empty — an empty screen they can watch fill is the point.
4. Say it once, in one line, in their language: the port, that what they see now is the empty starting screen, that it fills as you build, and that nothing will be asked of them until the end.
5. **Keep it current.** When a phase closes on something they can see, point the tab at it (`browser {op:'navigate'}` + `screenshot`) and say in one line what is new. The preview is for **watching**, never for testing: no "go try this", no per-tarefa approval.
6. A preview that cannot open — tab closed or under 50px, `browserFullAccess: false` in the harness settings.yaml — is reported in one line with the real reason, and the build goes on. A preview you could not show is never a reason to stop building.

**No subagent raises a server.** A builder or evaluator that needs the app uses the instance already up; if it looks dead, it says so and you restart it. One epic burned 71 app starts, 36 process kills and 99 `flock` calls across six different ports because every agent raised its own — that is the failure this rule exists to stop. A port is a shared resource, not something to allocate per agent.

Use a terminal tab, never a background job: a job dies when the session is discarded, and the job tooling itself tells the model to kill jobs before the final answer. The terminal belongs to the requester and outlives the turn.

## Every tarefa is announced

The requester always knows which tarefa is being worked on and where it stands. **Every status you write is announced in the same reply, in one line, in their language** — never a move without its line, never a line without its move:

| Move | `status:` written | The line |
|---|---|---|
| a builder starts it | `in_progress` | "Tarefa 03 — Cadastrar cliente: iniciada." |
| the builder returned and the checks start | `code_test` | "Tarefa 03 — Cadastrar cliente: testando." |
| the evaluator returned GREEN | `human_test` | "Tarefa 03 — Cadastrar cliente: finalizada (5 de 12)." |
| RED sends it back to the builder | `in_progress` | "Tarefa 03 — Cadastrar cliente: voltou para ajuste — <the finding in a few words>." |

Tarefas that move together get one line each. The "finalizada" line carries the count of finalizadas out of the total, so they always see how far the system is from finished. No other word replaces "tarefa" in these lines.

## The build never stops

From the first line of code to the last tarefa, nothing waits for the requester. Everything the loop raises — an ambiguous tarefa, artifacts that disagree, a missing decision, a stalled round, a library that does not do what the plan assumed, a screen that needs a field the prototype never drew — is yours: **decide, write it down, say it in one line, continue.** Every question they own was asked before this stage: the brief's Surface and delivery topics, the flows, the palette, every prototype screen, the plan's consequence questions, the execution plan.

Three things are still not yours:

1. **Something only they have** — a credential, an account, a paid plan, a real recipient, an OAuth app. Build everything around it against a mock behind an environment variable, record the item as waiting on a secret, keep every other tarefa moving, and collect every such item into ONE question at the end of the build. Never idle on one.
2. **An irreversible act on something real** — money moving, a real message or webhook leaving to a real person, data deleted outside the workspace, anything published. Ask before, always: this rule is about decisions, not about consequences that cannot be undone.
3. **Whole-product acceptance** — `status: done` is the human's move on the Kanban, and the guard denies that write to every agent. Never stopping is not the same as never handing over.

Anything else that feels like it needs them is a decision you are avoiding. Take it. Read `01-brief.md` `## Unknowns` first: a decision pre-declared there is already made — take it and cite the row. And a decision is always about **how** to deliver what was asked: adding a capability that is not in the brief's Must do is not a decision, it is a new epic, recorded as deferred.

## The triad

| Subagent | May do | May NOT do | Returns |
|---|---|---|---|
| **builder** | `write`/`edit` code and files for the tarefa scope only; build and typecheck with `bash` | touch tarefas' `status:`, redesign UX, widen scope, **start a server** | files changed + commands run + outputs |
| **qa-tester** | **write the tarefa's tests, and nothing else** (`write`/`edit` under `testes/` and the test-runner configs) — unit, typecheck, regression, e2e/flow cases for its "Done when"; it does NOT run them here | edit product code, run the suite | the test files written, and what each one asserts |
| **evaluator** | `read` the tarefa, the epic artifacts (brief/flows/prototype.md/plan) and the diff; judge match | edit anything | GREEN (work matches artifacts) or RED with the exact mismatch list |

**The suite is written here and run later.** Per tarefa, the proof is the flow working — the builder's build and typecheck, and the principal's own pass through the real screens. The battery of tests is not executed after each tarefa: the cases are written as the epic advances, and `/08-review` runs the whole thing before delivery. A tarefa is not held hostage by a suite nobody asked to run yet.

**The deploy files are the publication tarefa's, and nobody else's**: no earlier tarefa writes or checks a `Dockerfile`, a `docker/entrypoint.sh` or a `docker-compose.yml`. Whether that tarefa exists was answered in the brief's Surface and delivery topics and is never asked again; when it does exist it is the last tarefa of the build. The system still runs locally throughout, the way its framework runs (`pnpm dev`, `pnpm build && pnpm start`, the stack's own command), and the provider, the account and the domain stay unasked until after acceptance. When a tarefa does reach a deploy or database surface after that, run it through the workspace's connection tools — `railway_cli`/`vercel_cli` (deploy), `supabase_cli` (database) — and verify with a real URL, not a local mock: `browser {op:'navigate', url}` then `browser {op:'screenshot'}`. A command that exits successfully is **not** proof the deploy is correct: it must land on the application service (never the database), and the proof is the right service answering on the right URL. Follow the provisioning order and the verification in `/11-connections`.

Spawn with the `subagent` tool, always passing `role` (`builder`, `qa` or `evaluator`) — the guard binds the child's write surface to it, and an omitted role leaves a subagent free to write anywhere. Every spawned agent's prompt contains: the tarefa file path, the context-manifest paths, its single role, and the frozen-UX reminder ("prototype.md is a binding contract; mocks/CDNs allowed as declared; do not redesign"). Evaluators always `read` the artifacts themselves — never trust your summary, never trust the builder's.

**The guard is active**: `dsh-tool-guard` limits your own `write`/`edit` to `mds/`, `prototype/` and the product as a fast-fix window — the product is everything in the workspace except `mds/`, `prototype/`, `testes/` and `.git/`; a builder writes the product; qa writes `testes/` and the test-runner configs; an evaluator writes nothing. It denies `status: done` for every agent. A write you expected to succeed coming back denied is the law, not a bug — delegate it to the builder.

## Spawn briefing

The briefing is context injection, not documentation: it consumes the subagent's entire context window, and a long briefing kills the agent before its first file. Every spawn contains, in this order:

1. **Role in one sentence** — what the agent may and may not do.
2. **Paths + "read first"** — the tarefa/artifact path plus only the excerpts the agent needs ("read section X of Y"), never the artifact pasted.
3. **The GAP** — the acceptance items that still have no proof, numbered. This is the work contract.
4. **ALREADY PROVEN** — what the principal measured personally, each item with its proof (command + output). The subagent does not re-test any of it; it may at most contest with new evidence. Re-proving existing evidence is the largest source of hours lost.
5. **HOW IT WILL BE JUDGED** — the evaluator's checklist, verbatim: every line of this tarefa's "Done when" plus the `engineering-standards` items it touches. A builder that knows the checks writes to pass them; hiding the checklist is what turned 32% of one epic's dispatches into "fix" rounds (22% of all agent time).
6. **The app is already running** on the port the plan records — the builder uses it and never starts a server of its own.
7. **Known environment traps** of this harness (e.g. prefer `curl.exe` over `Invoke-WebRequest` on Windows, pass JSON bodies from a file, `.ps1` saved as UTF-8 with BOM, a local database already running — reuse it, do not raise another).

**A tarefa with a frontend** adds one line to the role: "Load the `shadcn-ui`, `ui-icons`, `ui-palette`, `frontend-design` and `baseline-ui` skills first — plus `react-ui-patterns` when the screen loads or mutates data, and `tailwind-patterns` when the tarefa touches the theme CSS; build every standard control from shadcn/ui components added with its CLI, using the template, base and preset from `04-tech-plan.md`, take every icon from the pack that same plan records, take every color from the theme variables set from `mds/epics/<epic>/03-palette.md`, and take fonts and motion tokens from `mds/epics/<epic>/03-design.md` so the screen animates as the prototype did." Load `react-best-practices` only for tarefas about data fetching, routing or performance, and never `ui-ux-pro-max` in a builder: the briefing budget above applies to loaded skills too. The evaluator's briefing loads `fixing-accessibility` and `fixing-motion-performance` in review mode and adds the matching checks: a hand-written control that a shadcn component covers is RED, so is a hand-written SVG or emoji that Lucide or Tabler covers, so is a color literal or default Tailwind color outside the theme CSS, so is a screen without the entrance, reveal, feedback and state-change motion of `03-design.md`, so is motion that breaks reduced motion or animates layout on a large surface, so is a missing loading, error or empty state, so is a critical accessibility violation, and so is a UI change without a real-browser screenshot.

**Every tarefa with a backend, an API or a frontend** also adds: "Load the `engineering-standards` skill and follow it: controllers only receive, delegate and respond, input validated by request validators, business rules in use cases, data transfer objects and repositories only at the boundaries where the plan names a need, responses serialized by the response serializer in the `{data, meta}` / `{error}` envelope, never models or internal structures exposed directly, every public endpoint documented in the API specification (inputs, outputs, errors, authentication, HTTP status codes) as it actually behaves, design-system tokens and components only, implemented with Tailwind CSS, the project's standard chart library, Recharts, and long, heavy or external work in background tasks on a reliable queue with timeout, retries, failure handling and idempotency — never a short operation the caller needs right away." The evaluator's briefing loads the same skill and applies its RED list.

Forbidden in the briefing: pasted artifact content (tarefa, schema, plan, contract), "read all of X" for anything over ~20 KB, narrative/history/repetition of the execution plan, more than ~80 lines total. If the briefing does not fit, the spawn's scope is wrong: split the work.

## The acceptance flow (the agent is the user)

The ONE acceptance test is the real user flow, executed by the AGENT with the full browser tool: open the real URL, sign in with the test credential (from a project file or env variable — the value is never echoed into chat or logs), click, fill, land where the flow says, read the outcome in the DOM, and screenshot every key step. A clean console on the new screen is part of GREEN — a console error is a finding. **The agent uses the app; the human is not a tester.**

Forbidden by default: generic batteries (mass invalid cases, byte-by-byte schema re-checks, re-proving what is already measured, bypass probes with no new route). They enter only against direct money, session, or silent-data risk. The cost of a test never exceeds the cost of building what it tests.

If the full browser tool is unavailable in some environment: extract the repo's own CDP driver, once, and drive the same ops through it. The skill NEVER instructs an operation the tool cannot execute — the briefing states the real workaround, never an impossible instruction.

## Per-tarefa loop

Follow the phases and the parallelism from `06-plano-de-execucao.md`; the loop type recorded there (a fresh agent per attempt, or the same builder/qa/evaluator carrying the tarefa) is the one to run. When it stops working — two attempts lost to context a fresh agent cannot rebuild, or a carried agent stuck on its own early assumption — switch it yourself, record the switch and its reason, say it in one line, and keep going. The build does not stop to ask permission for its own mechanics.

**Open the whole phase, not one tarefa.** The plan's phase lists which tarefas run together (`06 → … → 12 ∥ 19`, `14 ∥ 15 ∥ 16`). Before spawning anything, **write the eligible list out loud**: "fase N, elegíveis: 04, 13" — every tarefa of the phase in `active` whose dependencies are met. Then spawn one builder per tarefa on that list, **all in the same reply**, and stop.

**Spawning one when the list held two is disobeying the plan the requester validated**, not a style choice — it is the difference between the epic they approved and a queue of one. Two fronts the plan calls parallel are two spawns in one turn; if you believe a listed tarefa cannot start, say which file or symbol it shares with the one running, `edit` the plan, record the change, tell them in one line, and spawn what remains eligible in the same reply. Do not silently serialize, and do not ask whether you may change a plan you just proved wrong.

**A phase closes before the next opens.** Do not start a tarefa of phase N+1 while any tarefa of phase N is still in `in_progress` or awaiting its evaluator: the phases exist because the plan found real edges between them.

**Inspect in batches, with the right tool.** `read`, `grep` and `glob` are concurrency-safe: several of them in one step run in parallel and cost one round trip. `bash` is exclusive and serializes. So read files with `read`, search with `grep`, list with `glob` — never `cat`, `grep` or `ls` inside `bash` — and put every independent lookup in the SAME step. In one measured epic 53% of all tool calls were trivial lookups, one per step, costing about 250 minutes of pure round trips.

**Never wait.** After spawning, end the turn — the completion of each subagent comes back to you as a notification (`/00-start-here`, "Subagent truth"). A `sleep`, a polling loop or a repeated `list_agents` to check progress is a defect.

1. **List the eligible tarefas** of the phase (`active`, dependencies met), set every one of them to `status: in_progress` (`edit` the frontmatter — the Kanban tab shows it) and announce each as iniciada.
2. **Assemble context** and spawn a **builder per tarefa, `role: "builder"`, all in this same reply**. Each builder reports files + build output. When a builder returns, set its tarefa to `status: code_test` and announce it as testando before steps 3–5.
3. **Spawn the qa-tester** for each tarefa, `role: "qa"`: it writes the tests for that tarefa's "Done when" (typecheck, unit, regression, flow) under `testes/` and stops — running the battery is `/08-review`'s question to the requester, not this loop's gate.
4. **Prove the flow yourself**: walk the tarefa's screens or endpoints in the running app with the browser tool and read the outcome, as "The acceptance flow" below describes. That is the per-tarefa proof.
5. **Spawn the evaluator**, `role: "evaluator"` — the guard denies it every write, so its verdict is the text it returns: "does the diff match the tarefa's requirements AND the epic artifacts?" GREEN → set `status: human_test` and announce the tarefa as finalizada (queued for the owner's end-of-epic batch — not an invitation to test now). RED → set `status: in_progress`, announce it as back for adjustment, and the mismatch list goes back to the builder. Never spawn it as `qa`: that role may write tests, and a judge that can edit what it judges is not independent.
6. **No human mid-epic — and no question to them either.** No intermediate proofs, no test scripts sent, no "go try it" per tarefa, and no `ask_user_question`. What they get during the build is the preview and your one-line announcements. The principal publishes what passed the real flow and moves to the next tarefa. The human uses the system exactly ONCE: when the LAST tarefa closes — it has been in front of them in the Browser tab since the first minute, and now they use the whole app as a consumer, on their phone. No tables, no reports. Only then does final acceptance happen, and only there does anything move to `done` (whole-product acceptance, never per-piece). A rejected piece returns to the builder with the exact step that broke; two identical episodes in a row mean the approach is wrong, not that it is theirs to settle — change what is yours (the decomposition, the mechanism, the scope, the agent), record it, announce it in one line, continue.
7. When every tarefa of the phase is finalizada (`human_test`) or out of its round budget, open the next phase — back to step 1, with its own eligible list. Two consecutive rounds with the **same** finding are not a reason to ask: they are proof the round is wrong. Change one thing that is yours — the scope, the decomposition, the mechanism, the agent — record the change and its reason, announce it in one line, and run the next round. The round budget below is the real limit.

## Round rules

- A round is a builder pass **plus** the principal's own pass through the flow — never a critic alone. The written tests are not a round: nobody runs them here.
- Never relax a tarefa's "Done when" to make a round pass. When one turns out to be impossible or to contradict a frozen artifact, that is a decision you take: write the smallest change that keeps the tarefa's **outcome** true, `edit` it into the tarefa with the reason, record it, and say in one line what changed and what it means for them. What is forbidden is loosening a check silently to buy a GREEN.
- The evaluator checks **against the artifacts**, not against the builder's intentions. Traceability: every "Done when" item maps to a written test case or to a flow step the principal walked.
- Budget: cap rounds per tarefa up front (default 5). An unbounded loop burns trust and tokens. When a tarefa exhausts its budget, it does not get a question and it does not get more rounds: record exactly which "Done when" item is still unmet and what is missing, write that gap into the tarefa, leave it in `code_test` — it is not finalizada, and the system is not finished while it stays there — announce "Tarefa NN — <title>: não finalizada — <what is missing>" in one line, and open the next tarefa. `/08-review` carries it into "What I could NOT verify".
- **Time budget with a cut**: a subagent with no on-disk progress (a new or altered file, an updated log) for ~40 minutes is treated as stalled — interrupt it and respawn one that inherits what is on disk. A `running` status alone is not progress; the heartbeat exists to give this signal on every beat.
- **The QA writes against the GAP**: its briefing declares ALREADY PROVEN with the proof of each item, so the cases it writes attack what is still unproven instead of restating what the flow already showed.
- **Tests are functional first.** The cases cover the tarefa's "Done when" end to end — and stop there. No speculative suites hunting defects nobody asked for, no edge-case matrices beyond the contract. Findings that can wait (hardening, coverage breadth, style) are recorded as deferred in the tarefa and never block the loop. If the application works as specified, it is GREEN.
- **Speed is the loop's metric.** Tests and rounds optimize for the shortest path to GREEN; what can be done later is deferred, not done now.
- Report honestly at the end: rounds, findings raised/resolved, criteria unmet. "3 criteria still unmet" is a useful result; a false "done" is worthless.

## Evidence rules

- **A builder's own checks are not the acceptance proof.** They are a second opinion on unchanged work: the proof is the principal walking the real flow. The qa-tester's cases are written adversarially — to break the work, not to confirm it — and they are run as one battery in `/08-review`. In one epic the builder's 81 assertions passed and an independent test still found a security defect the suite never touched.
- **Every UI delivery needs a real-browser screenshot.** That is exactly the defect three code-only checks missed and one print caught in minutes.
- **Mandatory in the written matrix:** route bypass (percent-encoding, case, doubled slashes, `..`), path traversal, forged/expired/`alg`-swapped tokens, missing/extra fields, wrong types, and sensitive-field leakage on **every** route. These cases are written with the rest and run with the battery.
- **Agent evidence is a claim until the principal measures.** The principal personally checks each tarefa's highest-risk item with its own command before accepting. When the local environment cannot produce the proof, record the item as unproven — in the tarefa and in the decision ledger — and carry it to `/08-review`'s "What I could NOT verify". Deploying to prove something is not available during the build: nothing about deploy exists here, and the real environment becomes real only after acceptance.
- **Command success is not behavioural proof.** A passing build does not prove the screen works. Measure "before" and "after" with the same independent script when one exists.
- **Instrument error ≠ product error.** Before reporting a defect, confirm the tool is not the cause; reproduce with a second tool when the result is strange. On Windows prefer `curl.exe` for HTTP and pass JSON bodies from a file (`--data-binary @file`), not inline. When testing a rate-limiter or shared state, use a **new value per case**.
- **Closing hygiene is mandatory.** Any subagent that raised a server, browser or database ends with: the process killed by whoever owns the port, the disposable database deleted, and a printed confirmation (port free + database removed). Leftovers are the agent's failure, not the environment's — an orphaned leftover hijacks the next agent's work.
- **The publish gate**: production deploy happens only after the requester accepted the system and asked for it in `/08-review`, and then only with a real-browser proof of the delivered flow against the deployed URL. A green suite does not authorize publishing: a delivery can pass hundreds of assertions and still be unusable under real navigation.

## The decision ledger — `07-decisoes.md`

Created with the first decision, at `mds/epics/<epic>/07-decisoes.md`; an epic that needed none has no file and `/08-review` records "none". You are its only author: the guard denies `mds/` to every subagent, so a decision a builder reports in its result is a row **you** write.

**The rule of the pair: no decision is announced without being written, and none is written without being announced, in the same reply.** A ledger nobody heard is a diary; an announcement nobody wrote down is gone by the next phase.

```markdown
---
epic: <slug>
artifact: 07-decisoes
status: em-andamento
---
# Decisions taken during the build — <initiative>

| # | When | Tarefa | What came up | What I decided | Why | What it changes for you | Undo cost |
|---|---|---|---|---|---|---|---|
```

- **What came up** is written as the requester would ask it, not as the stack sees it.
- **What it changes for you** is the only column they will read: empty or full of jargon makes the row worthless.
- **Undo cost** is `cheap` (an afternoon) or `costly` (data, a contract, money) — `/08-review` reads the cheap ones back and offers to reverse them.
- An item blocked on a credential is a row too, with "built against a mock behind `<VAR>`, waiting on a secret" as the decision.
- `status: em-andamento` while the build runs; `/08-review` closes it.

## Close-out

The build ends when no tarefa is `active` or `in_progress`. **The system is finished only when every tarefa is finalizada** (`human_test`/`done`): say it in one line with the count ("12 de 12 tarefas finalizadas — o sistema está pronto"). When a tarefa is still in `code_test` after its round budget, the system is **not** finished: say "N de M tarefas finalizadas — o sistema não está finalizado", name each tarefa that is not and what it is missing, and never call the system finished or ready. Then read `07-decisoes.md` back in plain language first: how many decisions you took alone, the three that most change what they receive, and which are still cheap to undo. Then hand to `/08-review` for the final verification and honest walkthrough.

## Next

When no tarefa is `active` or `in_progress`, load `/08-review` with the `skill` tool. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
