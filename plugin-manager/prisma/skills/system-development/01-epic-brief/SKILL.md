---
name: 01-epic-brief
description: Capture a new initiative as an epic with a brief that establishes business viability, desirability, shape, features — starting with the Authorization Layer, the user types and roles every feature is written for — and the system's outer surface (API, webhooks, authentication and roles, external integrations, Docker delivery, reports) through staged questioning — stored as mds/epics/<epic>/01-brief.md. Every doubt is raised here, because from /04-construcao onward the agent decides alone and reports. No solutions, no tech.
whenToUse: Starting any new initiative. First pipeline stage, after /00-start-here. Requires /00-start-here loaded earlier in this session.
---

# Epic Brief

Capture what the initiative is and where its edges are, before anyone plans how to build it. Read `/00-start-here` first. The requester is usually not a programmer; a brief written from their first answer is always wrong — what they left out is what they consider too obvious to say.

## Create the epic

Epic = one folder. `write` nothing yet: first **choose a kebab-case slug naming the outcome** (e.g. `agendamento-barbearia`), then run the investigation below. The folder `mds/epics/<slug>/` is created when the brief is written.

## The investigation — five stages, in this order

Order is the method: viability before desirability, desirability before shape, shape before features. Asking about screens first produces a beautiful product nobody needs.

**A — Lean Startup (is there a real problem, and what would prove it)**
1. Whose problem is this? Name one real person, not a category.
2. What do they do today instead? Walk me through it.
3. How often does it hit — daily, weekly, twice a year?
4. What does it cost them when it happens?
5. Have they tried to solve it? Why did that stop working?
6. Would they pay? Have they paid for anything adjacent?
7. Smallest thing still useful on day one?
8. What must be true for this to work at all? Which is the shakiest?
9. How would we test that cheaply?
10. Three months in: what result says keep going, what says stop?

Research before you ask: use `web_search`/`web_fetch` to check competitors, adjacent tools and market evidence, so these questions land with facts instead of guesses. Bring findings as consequences, not citations.

**B — Business Model Canvas (does it sustain itself)** — walk all nine blocks, none silently: customer segments; value proposition ("I use this because it lets me ___ without ___"); channels; customer relationships; revenue streams; key resources; key activities; key partners; cost structure (and which cost grows fastest).

**C — Design Thinking (who is the human) — twenty questions, five per mode. All four modes run; abbreviating here is the most expensive mistake in the brief.**
- Empathise: last time it happened, what were they doing right before? Where are they physically? What else are they doing (attention budget)? What do they already use daily? What frustrates them most — their words?
- Define: "this person needs a way to ___ so that ___." What do they believe the problem is — are they right? What makes them abandon halfway? Which single moment matters most? What must never happen?
- Ideate: no software at all — how else? What does another industry do well? **The laziest version that still helps (q32, mandatory in the artifact)?** The ambitious version? Where do you want to land, and why?
- Prototype & test: first screen and next action? What would you show a real person tomorrow? Who could we put in front of it this week? What reaction means we got it wrong? **How will we know they are actually using it, not just visiting (q39, mandatory)?**

Before leaving C, count answers: fewer than twenty means you skipped some. Go back.

**D — Features, screens, behaviour (only now, and everything must trace up)**

**D0 — Authorization Layer, always first.** Before any feature is listed, ask who uses the system, because every feature after it is written for someone:
1. Does anyone sign in, or is everything open to whoever opens it?
2. Which **types of user** exist? Name each in their words — "dono da barbearia", "barbeiro", "cliente" — including people outside the company.
3. Which **roles** does each type hold, and can one person hold more than one role?
4. What may each role see, create, change and delete, and what must it never reach?
5. Who creates an account of each type, and who can grant, change or revoke a role?

Put the independent questions in one `ask_user_question` call, with a recommendation built from stages A–C. Read the result back as a table (type → role → may do → may never do) and get a yes before moving on. When the answer is "nobody signs in", record that as a decision, not as a skipped question.

Then:
- List what it must do; each item names the answer above that forces it **and the roles that use it**. No ancestor = a feature nobody asked for → propose cutting it. A feature no role from D0 uses is a sign that a role is missing, or that nobody needs the feature.
- Screens/steps in the order the person meets them; the empty state first.
- Where data comes from, where it lives, and which role may delete it.
- Happy scenarios as Given/When/Then, read back for confirmation; then every unhappy scenario: missing info, two people at once, mistake, connection drop.

**E — The unasked (week-two wants they did not say)** — propose each as a question with a recommendation, never as an assumption: history/log; reports and who reads them; undo vs confirm; notifications and channel; export/backup; concurrent users; phone/offline/language; sensitive data; 10× scale; six-months-next. **Record rejections too** — a deliberate "no" outranks an unasked question.

**F — Surface and delivery (six items, every one answered or refused out loud)** — nothing here is asked again later: once `/04-construcao` starts, the agent asks only at each screen's validation. Batch the independent ones into one `ask_user_question` call, each option phrased as a consequence.

1. **API** — will anything outside this system read or write its data? Their own app, a partner, a mobile client. A yes carries the documentation rule (`skill engineering-standards` rule 3: OpenAPI rendered with Swagger UI).
2. **Webhooks** — must the system **receive** events from elsewhere (payment confirmed, message delivered), or **tell** another system when something happens here? Name the events in their words.
3. **Authentication and roles** — confirms the D0 table against the features D listed: every feature has a role, and every role can do something. Ask only what D0 left open. Do not ask again what it already settled.
4. **External integrations** — payment, e-mail, WhatsApp, ERP, storage: which are real on day one, and which are wishes for later.
5. **Docker delivery** — does the delivery include publishing as a container, with migrations and seed running on start (`skill engineering-standards` rule 7)? A no means the system is delivered running locally and no deploy file is ever written.
6. **Reports and exports** — which reports and exports the system must produce, and who reads them. Confirms what E proposed.

These are **scope**, not technology: whether another system talks to this one, whether the owner wants a container. Which OpenAPI generator, which queue, which hosting provider stay in `/03-plano` and after acceptance.

## Coverage check before writing

Count: A=10, B=9 blocks, C=20 across four modes, D=the D0 table confirmed (or "nobody signs in" recorded) + capabilities with their roles + scenarios complete, E=list presented and answered, F=6 answered or refused. A stage short of its count is a stage to go back and finish — not to summarise. F short of six is worse than the others: what it does not ask, nobody asks — the build decides it alone.

## Write the artifact

The artifact lives in the workspace and is read and edited in the **MDS** tab (a plain editor — it shows the markdown source, not a rendered page). `write` to `mds/epics/<epic>/01-brief.md`:

```markdown
---
epic: <slug>
artifact: 01-brief
status: draft
---
# <initiative name>
## Problem / ## Outcome (observable!) / ## Riskiest assumption
## Business model (9-row table) / ## The person / ## The moment that matters
## Smallest useful version (q32) / ## How we will know it is working (q39)
## What we would show a real person tomorrow (q36–37)
## Authorization layer (table: user type → roles → may do → may never do; who creates accounts and grants roles — or "nobody signs in", recorded as a decision)
## Must do (table: capability → roles that use it → traces back to)
## Behaviour (Given/When/Then, happy + unhappy)
## Surface and delivery (API, webhooks, auth and roles, integrations, Docker, reports — each in their words, a refusal recorded as a refusal)
## In scope / Out of scope (with why) / ## Constraints (constraint → source → consequence)
## Proposed and rejected (suggestion → decision → why) / ## Unknowns
```

Set `status: validated` only after the requester reads it and says yes explicitly. Then hand off: "next I'll map what the user actually does, screen by screen — `/02-core-flows`."

## Rules

- No solutions anywhere. "We will use X" is `/03-plano` leaking. Stage F is the one exception, and only for scope: whether an API, webhooks, a login, an integration, a container or a report exists at all — never which library, generator, queue or provider serves it.
- Outcome must be observable ("a booking takes under a minute", not "better performance").
- Do not invent constraints or answers — an unverified constraint narrows the design for nothing.
- Ask in the requester's language and vocabulary. A vague answer is not an answer: re-ask from a different angle.
- If a stage is genuinely not applicable (internal tool, no revenue), say so out loud and record why — never silently drop it.

## Next

When the brief is `validated`, load `/02-core-flows` with the `skill` tool. The `skill` tool refuses a stage until its prerequisites were loaded earlier in this session.
