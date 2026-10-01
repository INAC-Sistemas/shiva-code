# Agent Note: team builds one domain at a time after a question session on its objects

Status: implemented

## Problem

The `team` preset's architecture stage asked for the whole data model before any code: every entity with its fields, relations, who creates, changes and deletes it, and what must be unique. The requester is usually not a programmer, and at that point they had to picture the entire system at once. The foundations then created the whole schema. Details the requester only thought of while using the first screens came back as changes to a model that was already built. Slices were grouped by page, so the rules of one business object were spread across several pages and their agents.

## Decision

- **The architecture stops at a domain map.** `pm-architecture` still records roles (D0), features, flows, stack, deploy mode and the fixed port. It replaces the Data model and the page list with a domain map: domains in build order, the objects of each domain by name and purpose, the pages each domain owns, and the relations between domains. Domain 01 is Acesso whenever anyone signs in. A domain references only objects of its own or of earlier domains, and a relation between two domains belongs to the later one.
- **One question session per domain.** `pm-domain-loop` (renamed from `pm-page-loop`, with the rename registered in `RENAMED_SKILLS`) opens each domain with at most two `ask_user_question` calls. They cover each object's information, life cycle, permissions per role, restrictions and relations, plus the deferred questions for that domain. Each question carries a recommendation. The answers go to `mds/epics/<epic>/dominios/NN-slug.md`: objects, life cycle, a permissions table, rules `R1…` as Given/When/Then with the refusal message, relations, and the domain's slices. The requester approves that document once. The last slice's approval question and the next domain's session share one `ask_user_question` call.
- **Foundations keep identity and access only.** Foundations phase 2 creates only the user and role tables, the seed users, authentication, the role check and `/docs`, and the shell renders every page of the domain map. The backend of a domain's first slice writes one migration, named after the domain, that holds every object and relation of the domain document. A change to an earlier domain is its own new migration. Applied migrations are never edited.
- **Slices, agents and tests follow the domain.** Slices are numbered `NN.x` by domain. Each domain gets its own backend and frontend agents, and the epic keeps one tester. Each rule belongs to exactly one slice. The backend enforces it in the use case, the frontend shows actions only for the roles and states the document allows, and the tester writes one refused and one allowed case per rule. The tester's existing regression run over earlier suites covers changes to earlier domains.

## Alternatives considered

- **No foundations; every table comes from its domain's migration.** Rejected: the skeleton, authentication, seed users, `/docs`, the shell and the test setup are shared by every domain. Without foundations, the first domain would build all of them while also carrying the most risk.
- **Keep the full data model up front and only ask the rules per domain.** It avoids migrations on later domains but keeps the whole-system interview that produced the late corrections.
- **Keep the name `pm-page-loop`.** It avoids a config change, but the name would describe a grouping the skill no longer uses.

## Consequences

- The requester answers smaller, concrete sessions just before each domain is built, and rules become named tests instead of implicit screen behavior.
- The schema grows by migration per domain. An answer in a later domain that changes an approved object costs a migration, a contract change and a regression run. The relations between domains in the domain map keep that rare but do not prevent it.
- The `prerequisites` row of the `team` preset (CLI and desktop copies) names `pm-domain-loop`. The persona and the delegation tool descriptions now describe domains.
