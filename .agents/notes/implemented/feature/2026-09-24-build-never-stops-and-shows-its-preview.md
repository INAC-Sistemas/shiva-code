# Agent Note: the build asks everything first, then never stops, with the preview open

Status: implemented

## Problem

The `system-development` pipeline spread its questions along the whole path, and several of them landed **after** construction had started. `/07-build` escalated with `ask_user_question` on a stalled round, on relaxing a ticket's "Done when", and on "anything the loop cannot settle"; `/06-tickets` let the requester pick "approve each ticket before the next starts"; `/08-review` asked whether to run the test battery and whether to deploy with Docker. An epic that was already producing code stopped and waited for its owner several times, and each wait cost a round trip on a decision the loop could have taken.

The system also stayed invisible until the end: `/08-review` opened the Browser tab on the finished app as the handover, so the requester watched nothing being built.

Two gaps made this worse. Nothing in the 24 product skills mentioned **webhooks** — not once — so a system that receives or emits events had no house rule, no plan row, no ticket check and no evaluator RED. And nothing ever asked whether the system had an **API** at all, although the `engineering-standards` rule that requires OpenAPI plus Swagger UI at `/docs` had been there all along.

## Decision

**Every question moves before `/07-build`.** `/01-epic-brief` gains stage **F — Surface and delivery**: six topics asked in one `ask_user_question` call and answered or refused explicitly — an API others consume, webhooks in either direction, authentication and roles, external integrations, Docker delivery, reports and exports. The coverage count becomes `A=10, B=9, C=20, D, E, F=6`, and the artifact carries a `## Surface and delivery` section in the requester's words. The "No solutions anywhere" rule gains a carve-out naming stage F as scope, never mechanism: whether an API exists is stage F, which OpenAPI generator serves it stays in `/04-tech-plan`.

**From `/07-build` on, the build decides and reports.** A new "The build never stops" section replaces the old `## Escalation`: everything the loop raises is decided, written to `mds/epics/<epic>/07-decisoes.md` and announced in one line, in the same reply — the rule of the pair, because a ledger nobody heard is a diary and an announcement nobody wrote down is gone by the next phase. Three things stay the requester's: something only they hold (a credential, an account, a real recipient), an irreversible act on something real (money moving, a message leaving, data deleted outside the workspace, anything published), and whole-product acceptance, which the guard already enforces by denying `status: done` to every agent. A ticket that exhausts its round budget records the unmet "Done when" item as a gap and moves on instead of asking. A UX change the implementation forces is decided during the build and enters the frozen contract through the amendment mechanism that already existed, carrying the principal's decision where it used to carry the owner's words.

**The preview opens in the first minute.** `/07-build` starts the application in its terminal tab as before, then immediately opens the Browser tab on it, screenshots it, confirms with `read_image` and says in one line what the requester is looking at. Each phase that closes on something visible points the tab at it again. The preview is for watching, never for testing.

**Webhooks become house rule 9**, appended rather than inserted so rules 3 through 8 keep their numbers and every cross-reference in the other skills stays true. Inbound: signature verified over the raw bytes before anything is parsed, constant-time comparison, replay window, idempotency on the sender's event id, a fast 2xx with the work on the queue of rule 6. Outbound: signed, dispatched from the queue after commit, timed out, retried with backoff to a recorded maximum, with a dead-letter store a person can inspect and replay. Both documented — the inbound endpoint in the OpenAPI of rule 3, the outbound events in an event catalog. The rule lands in the `/04-tech-plan` Decisions table, the `/06-tickets` Done-when list, the evaluator's RED list and the per-stack mapping table.

**Docker retiming follows from stage F.** The container question is answered in the brief and never asked again; the publication ticket exists only when that answer was yes, and it is the last ticket of the build rather than something written after acceptance. `/08-review` therefore runs the cold start as `docker compose up --build` when a container was asked for, runs the test battery instead of asking whether to, reads the decision ledger back, and keeps asking only for the go-ahead to publish and for the target, the account and the domain — the things nobody can decide on the owner's behalf.

## Alternatives considered

**Let the requester keep the per-ticket approval option in `/06-tickets`.** Rejected: it is a requester-selectable contradiction of the new rule. The third execution question now asks *when* they hear about decisions, not whether the build waits — and the call says plainly that either way it does not.

**Renumber the standards so webhooks sit beside API documentation.** Rejected: rules 3 to 8 are cited by number in `00-start-here`, `04-tech-plan`, `06-tickets`, `07-build`, `08-review` and inside `engineering-standards` itself. Appending as rule 9 costs one out-of-order reading and breaks nothing.

**Let the agent return to `/03-prototype` when a screen must change mid-build.** Rejected by the product owner: it is the one stop that would fire most often. The amendment mechanism absorbs it instead, and the change shows up in the preview the requester is already watching.

## Consequences

- `agentTerminalTools` now defaults to `true` in `dsh-better-sidebar`: without `terminal_create` the pipeline has no long-lived process to show, and the preview instruction would be unfollowable on a fresh install. This gives every new install an agent-visible interactive shell, which is a wider surface than before; the Side card toggle still turns it off and disposes the agent's terminals. The change does not reach the packaged desktop yet — `dsh-better-sidebar` is pinned in `pack-shiva-plugins.mjs` because its checkout is ahead of the bundled harness — so the running app carries the preference in `settings.yaml` until that pin is lifted.
- A wrong decision now compounds silently for as long as it takes the requester to notice it in the preview or in an announcement. What contains it: the round budget, the 40-minute no-progress cut, the evaluator that writes nothing, the guard's role surfaces, and the ledger that `/08-review` reads back with an undo cost per row.
- "Decide" is bounded to *how* the asked-for thing is delivered. A capability absent from the brief's Must do is not a decision to take, it is a new epic, recorded as deferred.
- A brief answered with "whatever you think" becomes six decisions taken alone during the build. The stage-F text pushes back on that by recording the recommendation and their acceptance of it rather than leaving the topic open.

## Verification

`node scripts/sync-skills.mjs --check` is clean, the `plugin-manager-dev` seed republished every edited skill with no `ignorado —` line, and `grep -rn "ask_user_question" .../0[78]-*/SKILL.md` finds only the hosting conversation in `/08-review` and the prohibition itself in `/07-build`. `dsh-better-sidebar` typechecks; it has no test suite.
