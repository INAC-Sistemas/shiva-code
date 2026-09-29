# Agent Note: each page delivered working, no mock API

Status: implemented

## Problem

The [three-stage pipeline](2026-09-28-three-stage-pipeline.md) built every page of `/02-frontend` on a mock API (MSW handlers answering typed fixtures, switched by `NEXT_PUBLIC_API_MOCK`) and built the whole backend afterwards in `/03-backend`. In the default stack (one Next.js app with Route Handlers and SQLite), this had three costs:

- The builders wrote each contract twice: once as an MSW handler with fixtures, and once as a Route Handler. The mock was deleted in `/03-backend`.
- `/03-backend` switched the mock off for every page at once, so authorization, pagination, error envelopes and real data surfaced together after every page was approved.
- The requester approved only how each page looked. A form never saved and a flow never ran before the delivery.

The product owner asked for every mock to be removed and for each page to be delivered working from frontend to backend. The evaluator's code review remains the only review.

## Decision

**`/02-frontend` delivers each page working.**
- Its principal is a full-stack developer and designer.
- The foundations builder creates the contracts module, the typed API client, the ORM with its SQLite development database, the schema of the architecture's data model, the first migration, the seed script (one user per role plus sample data), the backend layers, the permission check and the `/docs` OpenAPI generator.
- Each page tarefa carries its contracts, endpoints, persistence and screen. Its Done-when adds contract validation on every endpoint, the permission check on every route, and real database reads and writes.
- The requester approves each page by looking at it and using it, signed in as the seed user of each role.
- The principal applies migrations. Builders only add migration files and seed rows.

**`/03-backend` builds what has no page and hands the system over.** Its tarefas are the capabilities without a page: inbound webhooks, public API, jobs and integrations. When there are none, the stage goes straight to the cold-start check, the handover and the test-battery question.

**`/01-arquitetura` records a data model.**
- A new `## Data model` table lists entities, fields, relations, the roles that create, change and delete each entity, and uniqueness.
- The "Contracts and mock" Decisions row is now "Contracts and persistence".

**No mock anywhere.** MSW, in-memory fakes, fixtures and the mock switch are removed from every skill. `react-ui-patterns` points at seed rows instead of fixtures.

**Stage names are unchanged.** `02-frontend` and `03-backend` keep their names, so the `dsh-skill-library` prerequisites, the Kanban hints, the `dsh-palette` tool text and the seed rename list need no change.

## Alternatives considered

**Rename `02-frontend` and `03-backend` to match their new content.** Deferred. A rename needs `RENAMED_SKILLS` entries in `seed.ts` and updates to the profile prerequisites, the Kanban and palette plugin text and their tests. The names are internal; the requester hears only the stage announcements.

**Keep the mock only for a backend in another language.** Rejected by the owner, who asked for every mock to be removed. A separate backend is now created at the start of `/02-frontend`, and its endpoints are built in the same page tarefa.

**Build the whole backend before the pages.** Rejected. The requester decides by looking at pages, so a backend built first would find missing fields only when the pages arrive. The data model is settled in `/01-arquitetura` instead, which gives the pages a stable schema without building every endpoint up front.

## Consequences

- Each page tarefa is larger. The limit of 8 Done-when lines still counts what the page shows and does, and a larger page is split into parts, each with its own endpoints.
- A page approval now covers both how the page looks and whether it works, so the requester's adjustment rounds may touch endpoints and migrations.
- Data the requester creates while validating stays in the development database. The cold-start check in `/03-backend` rebuilds from an empty database.
- Epics already in `/02-frontend` with a mock have no migration path through these skills. Their `/03-backend` run must switch the mock off by hand.

## Verification

- `node scripts/sync-skills.mjs --check` reports no drift between `plugins/dsh-skill-manager/skills` and `plugin-manager/prisma/skills`.
- `grep -rniE "msw|fixture|API_MOCK" plugins/dsh-skill-manager/skills` matches only the lines that prohibit a mock.
- The plugin-manager seed ran, and the restarted dev server serves the new bodies.
