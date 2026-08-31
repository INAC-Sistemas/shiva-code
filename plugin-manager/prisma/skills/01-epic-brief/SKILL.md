---
name: 01-epic-brief
description: Capture a new initiative as an epic with a brief that establishes business viability, desirability, shape and features through staged questioning — stored as mds/epics/<epic>/01-brief.md. No solutions, no tech.
whenToUse: Starting any new initiative. First pipeline stage, after /00-start-here.
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

**B — Business Model Canvas (does it sustain itself)** — walk all nine blocks, none silently: customer segments; value proposition ("I use this because it lets me ___ without ___"); channels; customer relationships; revenue streams; key resources; key activities; key partners; cost structure (and which cost grows fastest).

**C — Design Thinking (who is the human) — twenty questions, five per mode. All four modes run; abbreviating here is the most expensive mistake in the brief.**
- Empathise: last time it happened, what were they doing right before? Where are they physically? What else are they doing (attention budget)? What do they already use daily? What frustrates them most — their words?
- Define: "this person needs a way to ___ so that ___." What do they believe the problem is — are they right? What makes them abandon halfway? Which single moment matters most? What must never happen?
- Ideate: no software at all — how else? What does another industry do well? **The laziest version that still helps (q32, mandatory in the artifact)?** The ambitious version? Where do you want to land, and why?
- Prototype & test: first screen and next action? What would you show a real person tomorrow? Who could we put in front of it this week? What reaction means we got it wrong? **How will we know they are actually using it, not just visiting (q39, mandatory)?**

Before leaving C, count answers: fewer than twenty means you skipped some. Go back.

**D — Features, screens, behaviour (only now, and everything must trace up)**
- List what it must do; each item names the answer above that forces it. No ancestor = a feature nobody asked for → propose cutting it.
- Screens/steps in the order the person meets them; the empty state first.
- Who can do what (kinds of user); where data comes from, lives, and who may delete it.
- Happy scenarios as Given/When/Then, read back for confirmation; then every unhappy scenario: missing info, two people at once, mistake, connection drop.

**E — The unasked (week-two wants they did not say)** — propose each as a question with a recommendation, never as an assumption: history/log; reports and who reads them; undo vs confirm; notifications and channel; export/backup; concurrent users; phone/offline/language; sensitive data; 10× scale; six-months-next. **Record rejections too** — a deliberate "no" outranks an unasked question.

## Coverage audit before writing

Count: A=10, B=9 blocks, C=20 across four modes, D=capabilities+scenarios complete, E=list presented and answered. A stage short of its count is a stage to go back and finish — not to summarise.

## Write the artifact

`write` to `mds/epics/<epic>/01-brief.md`:

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
## Must do (table: capability → traces back to)
## Behaviour (Given/When/Then, happy + unhappy)
## In scope / Out of scope (with why) / ## Constraints (constraint → source → consequence)
## Proposed and rejected (suggestion → decision → why) / ## Unknowns
```

Set `status: validated` only after the requester reads it and says yes explicitly. Then hand off: "next I'll map what the user actually does, screen by screen — `/02-core-flows`."

## Rules

- No solutions anywhere. "We will use X" is `/04-tech-plan` leaking.
- Outcome must be observable ("a booking takes under a minute", not "better performance").
- Do not invent constraints or answers — an unverified constraint narrows the design for nothing.
- Ask in the requester's language and vocabulary. A vague answer is not an answer: re-ask from a different angle.
- If a stage is genuinely not applicable (internal tool, no revenue), say so out loud and record why — never silently drop it.
