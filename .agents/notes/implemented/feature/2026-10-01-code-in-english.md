# Agent Note: generated systems name everything in the code in English

Status: implemented

## Problem

The `team` preset's agents named code after the requester's words. A 2026-10-01 run produced routes and API paths such as `/entrar`, `/moradores` and `/api/acesso/eu`, and files such as `src/contracts/acesso.ts`, next to English framework code. No rule chose a code language, so each agent picked one per name. The result mixed two languages, and the same domain object could get different names in different layers.

## Decision

- **Rule 10 of `engineering-standards`.** Code is written in English:
  - file and folder names, page routes, API paths and their parameters;
  - identifiers of every kind, database tables, columns and migration names;
  - contract fields, JSON fields, error codes and environment variables;
  - CSS classes, test names and code comments.

  Only what a person reads in the product stays in the requester's language: screen copy, error `message` text, notifications, and seed data shown as content. The process artifacts under `mds/` also stay in the requester's language, and the fixed pipeline paths (`mds/`, `testes/`, tarefa slugs) keep their names.
- **One glossary.** The architecture's domain map records each object's English code name and each page's English route next to the requester's word. Each domain document adds the English names of its fields, states and routes. Every layer uses those names, so model, table, contract, endpoint, component and test agree.
- **Enforced where the work is judged.** `engineering-standards` adds a Decisions row, an evaluator RED item and a naming quick check. `backend-page`, `frontend-page` and `tester-page` point at rule 10 at the step where they name things.

## Alternatives considered

- **Code in the requester's language.** Rejected: frameworks, libraries and the generated scaffolding are English, so the code would still mix two languages, and a later maintainer could not assume either one.
- **Leave it to each agent.** Rejected: that is what produced the mixed names.

## Consequences

- Routes the requester sees in the address bar are in English (`/residents`), while the page itself speaks their language. A requester who wants localized URLs overrides rule 10 explicitly, and the architecture records their words.
- The domain map and domain documents carry one more column, the glossary, which the project manager fills during the interview and the domain sessions.
- The rule lives in skill text only. No tool guard checks names, so the evaluator's RED item and the tester's review are what catch a violation.
