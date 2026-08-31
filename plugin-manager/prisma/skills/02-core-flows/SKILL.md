---
name: 02-core-flows
description: Map what the user actually does — actors, journeys, happy and unhappy paths, and the UX decisions each flow forces — as mds/epics/<epic>/02-flows.md, before any technical design freezes them.
whenToUse: Right after /01-epic-brief is validated, before /03-prototype.
---

# Core Flows

Map behaviour, not components. Read `/00-start-here` first. Requires `mds/epics/<epic>/01-brief.md` with `status: validated` — flows invented without a stated problem describe a product nobody asked for.

## Procedure

1. **Read the brief.** `read` the brief; every flow must trace to a Must Do or a Behaviour scenario in it.
2. **List the actors** — end user, agent, background job, external system. A flow with an unnamed actor hides an assumption.
3. **One flow per actor goal** — not per screen, not per endpoint. "Book a slot" is a flow; "click plus" is a step.
4. **Happy path in numbered steps**: actor action → system response → what they see.
5. **Unhappy paths per flow**: empty state, no permission, network failure, abandonment halfway, two actors at once. Most product defects live here; most flow documents skip it.
6. **Record the UX decisions each flow forces**: where confirmation happens, what is undoable, what is remembered between sessions, what the user must be told versus what stays silent.
7. **Write** `mds/epics/<epic>/02-flows.md` (shape below), read it back in plain language, get the explicit yes, set `status: validated`.
8. **Hand off to `/03-prototype`**: "next I'll build this as a clickable prototype so you can validate every screen before we plan the build."

## Artifact shape

```markdown
---
epic: <slug>
artifact: 02-flows
status: draft
---
# Core flows — <initiative>

## Actors
| Actor | What they want |

## Flow 1: <actor goal>
**Happy path**
1. <action> → <response> → <what they see>

**Unhappy paths**
| Situation | Behaviour |

**UX decisions**
| Decision | Choice | Why |

## Flow 2: …

## Deliberately unsupported
<what a reader will expect and this design does not do>
```

Use a mermaid diagram when a flow has more than three participants or branches.

## Rules

- Describe behaviour, never components. Naming a React component ends the flow and starts the plan.
- Every flow needs at least one unhappy path. No failure modes = not thought through.
- The empty state is a flow, not an afterthought — it is the first thing every new user sees.
- Do not settle technical mechanism here. That is `/04-tech-plan` — and only after `/03-prototype` validates the UX.
