---
name: 05-debate
description: Run a structured multi-perspective argument over one consequential, genuinely ambiguous technical decision and synthesise a verdict into mds/epics/<epic>/05-debates.md — with cross-examination and recorded rejections.
whenToUse: When /04-tech-plan hits a fork where choosing wrong is expensive and one viewpoint is not enough.
---

# Debate

Run a structured argument over one consequential, genuinely ambiguous choice, then decide. Not for settled questions — a debate over an obvious default is theatre.

## Procedure

1. **State the question in one sentence, with the alternatives.**
2. **Assign genuinely opposed positions** — one per lens (correctness, operational cost, migration risk, user experience, the maintainer in two years). Three agents agreeing is one agent with extra latency.
3. **Argue each position independently** — one `subagent` per position, or separate passes. Each states its case, **what would have to be true for it to be wrong**, and the strongest objection to it.
4. **Cross-examine in this exact shape**: give every position the single strongest objection of each other position, one at a time, demanding a direct answer to that objection alone. Summaries let positions dodge the sharp point. A position that cannot answer has lost that ground — record which.
5. **Score against what this project cares about** — criteria named before the arguments are read, so they are not fitted to a favourite.
6. **Synthesise**: pick a winner and say why; graft the parts of losing positions that survived cross-examination.
7. **Append** the record to `mds/epics/<epic>/05-debates.md` (create with frontmatter `epic`/`artifact: 05-debates` on first use), and feed the decision back into `04-tech-plan.md` via `edit`.

## Record shape

```markdown
## Decision: <question>
### Criteria (stated before the arguments)
### Positions
#### <A> — Case / Wrong if / Strongest objection / Answer to strongest objection
#### <B> …
### Cross-examination (claim → challenged by → survived?)
### Decision (the choice and the reasoning that actually drove it)
### Grafted from rejected positions
### What would change this decision
```

## Rules

- Assign positions before reasoning; none is a strawman.
- "What would have to be true for me to be wrong" is mandatory per position — it separates debate from advocacy.
- **You synthesise**, not the positions; the winner does not grade itself.
- A tie is legitimate: "either works; chose A for <reason>", tiebreak = reversibility, said out loud.
- Never present the synthesis as unanimous when it was not.
- One debate per decision; bundle nothing.
