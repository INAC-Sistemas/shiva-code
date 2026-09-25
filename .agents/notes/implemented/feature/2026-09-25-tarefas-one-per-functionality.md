# Agent Note: tarefas, one per functionality, announced as they move

Status: implemented

## Problem

The `system-development` pipeline called its unit of work a "ticket", a word the requester does not use. `/06-tickets` cut tickets along "vertical seams" with a coverage matrix, so a single functionality could still be split into a backend ticket and a frontend ticket, and several tickets could be plumbing that no user would recognize. Each ticket had a budget of about 400 words. During `/07-build`, the requester saw the Kanban move but was never told which ticket the agent had started, was testing or had finished. `code_test` existed as a column but no step of the loop wrote it. "The system is finished" had no definition apart from "every ticket is `human_test`/`done`", and a ticket that ran out of its round budget was moved to `human_test` with its gap written into it, so it counted as finished.

## Decision

**The unit is a "tarefa" everywhere the requester sees it.** The product skills, the Kanban copy and the `dsh-tool-guard` denial messages say "tarefa". The folder `06-tickets/`, the skill name `/06-tickets`, the `ticket:` frontmatter key and the `status:` values are unchanged. Keeping them means existing epics, the guard's path checks, the stage prerequisites in `agent.cordis.yml` and the `LibrarySkill` rows that profiles on the VPS select by name all keep working.

**One tarefa = one functionality.** `/06-tickets` first lists every functionality of the system: the brief's Must do, every flow, every prototype screen and every **yes** in Surface and delivery. It shows that list to the requester and writes exactly one tarefa for each item. When a functionality needs both a backend and a frontend, both are in the same tarefa. The body contract has separate `## Backend` and `## Frontend` sections, and each is omitted when the functionality does not have that side. Shared foundations are built inside the first tarefa that needs them, so no tarefa is only plumbing. A tarefa that does not fit its budget of about 250 words is split by what the user can do, never by layer.

**Every move is announced.** `/07-build` writes `in_progress` when a builder starts, `code_test` when the builder returns and the checks begin, `human_test` on GREEN, and `in_progress` again on RED. Each write is announced in the same reply as "Tarefa NN — <title>: iniciada / testando / finalizada / voltou para ajuste". The "finalizada" line carries a count, for example "5 de 12". The Kanban shows the same statuses as A fazer, Iniciada, Testando, Finalizada and Aceita.

**The system is finished only when every tarefa is finalizada** (`human_test`, or `done` after acceptance). A tarefa that exhausts its round budget now stays in `code_test` with its gap and is announced as "não finalizada". `/07-build` close-out and `/08-review` both state "N de M tarefas finalizadas". While any tarefa is not finalizada, they do not call the system finished.

## Alternatives considered

**Rename the folder, skill and frontmatter key to `06-tarefas` / `tarefa:`.** The product owner rejected this. Profiles on the VPS select `06-tickets` by name, and the Kanban and the guard would have to read both folders for existing epics. The requester never sees these identifiers.

## Consequences

- `code_test` is now written during every build, and `dsh-tool-guard` already counts it in `FROZEN_AFTER`. `prototype.md` therefore freezes when the first tarefa enters testing, where before it froze when the first tarefa reached `human_test`.
- Opening the next phase now waits for each tarefa of the current phase to be finalizada or out of its round budget, so a stuck tarefa does not block the build.
- The Kanban copy is Portuguese and hardcoded. `dsh-kanban` is a plugin outside the typed Client UI dictionaries.

## Verification

`node scripts/sync-skills.mjs --check` is clean. `node --test plugins/dsh-tool-guard/test/allowlist.test.mjs` passes 13/13. `node --check plugins/dsh-kanban/lib/client.js` parses. Both plugin tarballs were repacked and their `desktop/package-lock.json` integrity values updated.
