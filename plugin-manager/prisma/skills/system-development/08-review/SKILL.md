---
name: 08-review
description: Final gate — verify everything delivered against the epic artifacts, ask the requester whether to run the test battery before delivering, produce the cold-machine human walkthrough, write the honest delivery report (verified vs not verified) as mds/epics/<epic>/08-review.md, and only after acceptance ask whether to deploy with Docker and create the deploy files.
whenToUse: When every ticket from /07-build is human_test/done and delivery is next. Requires /00-start-here and /07-build loaded earlier in this session.
---

# Review & Handover

The requester trusts your "done" completely — that is why this skill exists. Read `/00-start-here` (the law of done and handover law) and apply it to the whole epic.

## Procedure

1. **Read the epic artifacts**: `01-brief.md` (outcome + Must Do), `02-flows.md` (every flow's happy + unhappy paths), `prototype.md` (frozen UX contract), `04-tech-plan.md` (decisions + boundaries).
2. **Verify outcome, not tickets**: each Must Do from the brief gets evidence — executed command, real output, or the exact reason it cannot be verified from here. A checked ticket whose evidence you cannot reproduce today counts as UNVERIFIED.
3. **Traceability sweep**: every UX id in `prototype.md` → working feature. Every boundary in the plan ("we will not do X") → still true.
4. **Full run from cold**: from an empty database, run the app's own migrate and seed commands and restart the application in its terminal tab (`/07-build`, "The app stays up"); confirm the exact "working" signals yourself, then write the walkthrough a human can follow from a cold machine (see shape) — it goes in the artifact as an appendix, not as the delivery. No Docker here: those files do not exist yet (step 6).
5. **Ask about the test battery, before delivering**: the epic's tests were written ticket by ticket and never run as a suite (`/07-build`). Ask once, in plain language — "quer que eu rode a bateria de testes antes de te entregar?" — with the consequence on each side: running it may surface defects to fix first and takes time, skipping it delivers now with the cases on disk for whenever they want. On a yes, run the whole suite, fix what it breaks through the builders, and report what passed and what did not. On a no, say plainly that the suite exists and was not run.
6. **Hand over the running application, not instructions.** The app is already up on its port (`/07-build`); the delivery is the requester seeing it:
   - `browser {op:'open', url:'http://localhost:<port>'}` brings the Browser tab to the front on the app's first screen;
   - `browser {op:'screenshot'}` records what is on screen, and `read_image` confirms you are describing the real thing;
   - say, in one line, what they are looking at and where to click first.

   The tab must be visible and at least 50px wide, and full access must be on, or the browser tool answers with the reason — report that reason instead of claiming a preview that is not there. The terminal tab beside it shows the server; say plainly that closing the app stops it, and that the artifact carries the start command.
7. **Write** `mds/epics/<epic>/08-review.md` (shape below) and present the delivery report in the requester's language: what is verified, what is not, what broke and was fixed, what they must test themselves.

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
## Preview handed over (URL, screenshot path, what the requester saw)
## Human walkthrough (cold machine, appendix)
1. run `<command>` in `<dir>` → you will see <signal>
2. open <url/screen> → click <path> → expect <result>
3. <unhappy path> → expect <recovery>
## Findings during review (found → fixed? → evidence)
## Decisions taken without asking (none, or list + why)
```

## Deploy: only after they accept

The whole epic is proven running locally. **Publishing is a separate conversation that starts only after the requester used the finished system and said it is what they wanted** — never in `/04-tech-plan`, never mid-build. Only then:

1. **Ask whether to deploy with Docker**: "quer publicar esse sistema com Docker?" — yes means the containers are built and published; no means the delivery ends here, running locally, with nothing extra written.
2. **On a yes, the publication ticket runs**: it creates every deploy file at once — `Dockerfile`, `.dockerignore`, `docker/entrypoint.sh` applying the migrations and running the seed on start, `docker-compose.yml` (`skill engineering-standards` rule 7) — and proves them: from an empty database, `docker compose up --build` logs the migrations applied, the seed run and the server listening, the app answers, and a second start applies no migration and duplicates no seed row. Until this yes, none of these files exists in the workspace.
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
