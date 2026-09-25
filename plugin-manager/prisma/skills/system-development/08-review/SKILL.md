---
name: 08-review
description: Final gate — verify everything delivered against the epic artifacts, run the test battery and report what it found, produce the cold-machine human walkthrough, hand over the running application in the Browser tab, read back every decision the build took alone, write the honest delivery report (verified vs not verified) as mds/epics/<epic>/08-review.md, and only after acceptance ask for the go-ahead to publish and for the target, the account and the domain.
whenToUse: When /07-build left no tarefa active or in progress and delivery is next. Requires /00-start-here and /07-build loaded earlier in this session.
---

# Review & Handover

The requester trusts your "done" completely — that is why this skill exists. Read `/00-start-here` (the law of done and handover law) and apply it to the whole epic.

## Procedure

1. **Read the epic artifacts**: `01-brief.md` (outcome + Must Do), `02-flows.md` (every flow's happy + unhappy paths), `prototype.md` (frozen UX contract), `04-tech-plan.md` (decisions + boundaries).
2. **Verify outcome, not tarefas**: each Must Do from the brief gets evidence — executed command, real output, or the exact reason it cannot be verified from here. A checked tarefa whose evidence you cannot reproduce today counts as UNVERIFIED.
3. **Count the tarefas**: list every tarefa of `06-tickets/` with its state (finalizada, or not finalizada and what it is missing). The system is delivered as finished only when every tarefa is finalizada; otherwise say first, in one line, "N de M tarefas finalizadas — o sistema não está finalizado", and every missing piece goes into "What I could NOT verify".
4. **Traceability sweep**: every UX id in `prototype.md` → working feature. Every boundary in the plan ("we will not do X") → still true.
5. **Full run from cold**: from an empty database, run the app's own migrate and seed commands and restart the application in its terminal tab (`/07-build`, "The app stays up"); confirm the exact "working" signals yourself, then write the walkthrough a human can follow from a cold machine (see shape) — it goes in the artifact as an appendix, not as the delivery. When the brief asked for a container, this cold run IS `docker compose up --build`: the container applies the migrations and runs the seed on start (`skill engineering-standards` rule 7) and the application answers. When it did not, the run is the framework's own migrate, seed and start, and no deploy file exists.
6. **Run the battery, then say what it found**: the epic's tests were written tarefa by tarefa and never run as a suite (`/07-build`). Run the whole suite now — it is the last chance to catch something before they see it — fix what it breaks through the builders, and report what passed, what failed and what you chose not to fix, one line each. You do not ask first: running it is your call, like every call since `/07-build`. When the suite itself is broken (no runner configured, cases that never compiled), say so plainly, record it as unverified and deliver anyway — a broken suite never delays the delivery.
7. **Hand over the running application, not instructions.** The app is up and the Browser tab has been on it since the first minute of `/07-build` — this is not opening a preview, it is handing over the one they watched being built:
   - `browser {op:'navigate', url:'http://localhost:<port>'}` puts the tab back on the app's first screen;
   - `browser {op:'screenshot'}` records what is on screen, and `read_image` confirms you are describing the real thing;
   - say, in one line, what they are looking at and where to click first.

   The tab must be visible and at least 50px wide, and full-scope browser access must not be revoked (`browserFullAccess: false` in the harness settings.yaml), or the browser tool answers with the reason — report that reason instead of claiming a preview that is not there. The terminal tab beside it shows the server; say plainly that closing the app stops it, and that the artifact carries the start command.
8. **Read back the decisions taken alone.** `read` `mds/epics/<epic>/07-decisoes.md` and reproduce its table in the report. Say out loud the three that most change what they received, in their words, and which of them are still cheap to undo. They heard each one as it happened — this is the consolidated list, never a surprise. An epic with no such file records "none".
9. **Write** `mds/epics/<epic>/08-review.md` (shape below) and present the delivery report in the requester's language: what is verified, what is not, what broke and was fixed, what they must test themselves.

## Artifact shape

```markdown
---
epic: <slug>
artifact: 08-review
status: delivered
---
# Delivery review — <initiative>
## Tarefas (N de M finalizadas; each one not finalizada with what it is missing)
## Outcome check (brief outcome → evidence per Must Do)
## UX sweep (prototype.md → all screens verified, changes found and how they were handled)
## What I verified (each: how, when, output)
## What I could NOT verify (each: why, and exactly what the human should do)
## Preview handed over (URL, screenshot path, what the requester saw)
## Human walkthrough (cold machine, appendix)
1. run `<command>` in `<dir>` → you will see <signal>
2. open <url/screen> → click <path> → expect <result>
3. <unhappy path> → expect <recovery>
## Findings during review (found → fixed? → evidence)
## Decisions taken without asking (the `07-decisoes.md` table reproduced, with the undo cost of each — or "none")
```

## Deploy: only after they accept

The whole epic is proven running locally. **Publishing is a separate conversation that starts only after the requester used the finished system and said it is what they wanted.** Whether the system ships as a container was settled in the brief and built during the epic; what is still theirs, and only theirs, is the go-ahead and everything that needs an account they own — provider, credentials, domain. Only then:

1. **Confirm the publication, do not re-ask the question**: the brief already recorded whether this system ships as a container, and the publication tarefa already built the files. Ask only for the go-ahead to publish — "posso publicar?" — yes means the containers are built and published; no means the delivery ends here, running locally, with nothing extra written.
2. **The deploy files already exist and were already proven** by the publication tarefa at the end of `/07-build` — `Dockerfile`, `.dockerignore`, `docker/entrypoint.sh` applying the migrations and running the seed on start, `docker-compose.yml` (`skill engineering-standards` rule 7). Step 5's cold run is that proof. When the brief asked for no container, none of these files exists and publishing is not on the table.
3. **Then ask where it runs**, in one `ask_user_question` call: the target (Railway, their own VPS, elsewhere), who owns the account, and the domain. Follow `/11-connections`: `status`, `login` in the browser, the provisioning order, the explicit `--service`, and the proof that the right service answers on the right URL with a real-browser screenshot.

Accepted but not published is a complete delivery: say plainly that the system is ready and works, and that publishing is one step whenever they want it.

## Rules

- Walkthrough steps you have not executed yourself are guesses — run each one first, now, not "earlier".
- Never write a deploy file, and never ask about hosting, provider, domain, account or credentials, before acceptance. A system that is not accepted is never published, so that question would have been spent on a decision nobody needed.
- "It is running at X" is allowed here, and only here, because you just opened it in front of them — and it comes WITH the start command for the machine where it is not running.
- Honest partial delivery ("I could not verify C because …") keeps their trust; one false "done" spends it all.
- Anything broken found here: say it first, plainly, with the fix or the proposal — never let them discover it.
- After delivery, when something you shipped breaks: report it unprompted, with impact and plan.

## Suspect the deploy path, not the code

- Build passes + deploy fails with **no log** + retry fails the same way = suspect the **trigger path**, not the code. In one epic the GitHub-push deploy failed silently three times (build OK, container never started, zero logs) while `railway up` of the same code succeeded. Prove the start locally against the real database, and use `railway up --service <svc>` as the workaround, telling the owner.

## Next

This is the last stage; the pipeline ends with the handover.
