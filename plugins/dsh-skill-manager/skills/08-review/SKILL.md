---
name: 08-review
description: Final gate — run the full verification of everything delivered against the epic artifacts, produce the cold-machine human walkthrough, and write the honest delivery report (verified vs not verified) as mds/epics/<epic>/08-review.md.
whenToUse: When every ticket from /07-build is human_test/done and delivery is next.
---

# Review & Handover

The requester trusts your "done" completely — that is why this skill exists. Read `/00-start-here` (the law of done and handover law) and apply it to the whole epic.

## Procedure

1. **Read the epic artifacts**: `01-brief.md` (outcome + Must Do), `02-flows.md` (every flow's happy + unhappy paths), `prototype.md` (frozen UX contract), `04-tech-plan.md` (decisions + boundaries).
2. **Verify outcome, not tickets**: each Must Do from the brief gets evidence — executed command, real output, or the exact reason it cannot be verified from here. A checked ticket whose evidence you cannot reproduce today counts as UNVERIFIED.
3. **Traceability sweep**: every UX id in `prototype.md` → working feature. Every boundary in the plan ("we will not do X") → still true.
4. **Full run from cold**: execute the start commands yourself, confirm the exact "working" signals, then write the walkthrough a human can follow from a cold machine (see shape).
5. **Write** `mds/epics/<epic>/08-review.md` (shape below) and present the delivery report in the requester's language: what is verified, what is not, what broke and was fixed, what they must test themselves.

## Artifact shape

```markdown
---
epic: <slug>
artifact: 08-review
status: delivered
---
# Delivery review — <initiative>
## Outcome check (brief outcome → evidence per Must Do)
## UX sweep (prototype.md → all screens verified, changes found and how they were handled)
## What I verified (each: how, when, output)
## What I could NOT verify (each: why, and exactly what the human should do)
## Human walkthrough (cold machine)
1. run `<command>` in `<dir>` → you will see <signal>
2. open <url/screen> → click <path> → expect <result>
3. <unhappy path> → expect <recovery>
## Findings during review (found → fixed? → evidence)
## Decisions taken without asking (none, or list + why)
```

## Rules

- Walkthrough steps you have not executed yourself are guesses — run each one first, now, not "earlier".
- Never write "it is running at X"; write how to start it and what "working" looks like.
- Honest partial delivery ("I could not verify C because …") keeps their trust; one false "done" spends it all.
- Anything broken found here: say it first, plainly, with the fix or the proposal — never let them discover it.
- After delivery, when something you shipped breaks: report it unprompted, with impact and plan.
