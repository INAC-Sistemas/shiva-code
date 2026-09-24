# Agent Note: House engineering standards as a pipeline skill

Status: implemented

## Problem

The product owner wants every system built here to follow the same engineering rules: a clear responsibility per layer, API responses serialized by a dedicated representation layer, formal and up-to-date documentation of every public API contract, a consistent design system, and one standardized chart library. Stated in chat, such rules do not survive the pipeline: `/01` and `/02` exclude technology, the `/07-build` subagents receive artifact paths rather than the conversation, and the evaluator judges the code against the plan, so a rule absent from `04-tech-plan.md` cannot make a ticket RED.

## Decision

A library skill, `engineering-standards` (source `plugins/dsh-skill-manager/skills/system-development/engineering-standards/SKILL.md`, mirrored and seeded like every product skill), states six rules as checkable criteria. The backend rules hold in any backend language: layers are named by role (controller, request validator, data transfer object, use case, model, response serializer, repository), and a mapping table shows, only as examples, how Laravel, NestJS, Spring Boot, ASP.NET Core, Django/FastAPI and Go realize each role, the API specification and background tasks; `/04-tech-plan` records the chosen backend and its mechanism per role. OpenAPI with Swagger UI is the specification format for HTTP APIs in any language. The frontend is fixed — React, Tailwind CSS with shadcn/ui, and Recharts — in a Frontend stack section. Rule 4 requires a consistent design system with reusable tokens for colors, typography, spacing, dimensions and components; rule 5 requires one appropriate, project-standard visualization library per purpose. Rule 6 governs asynchronous processing: long-running, resource-intensive, externally dependent or not-needed-now work goes to a reliable queue as small, independent, observable, retryable and idempotent tasks — carrying ids rather than models or secrets, dispatched after commit, with timeout, attempts, backoff and failure handling, a 202 status resource when the caller waits, non-overlapping scheduled tasks — while short operations whose result the caller needs stay synchronous; the plan names the stack's queue mechanism. The first spells out each layer's job in the product owner's words rather than naming SOLID: controllers only receive, delegate and respond (no business rules, no direct access to several repositories, no complex transformations or external calls); request validators validate and authorize; explicit data transfer objects cross an architectural boundary only where decoupling, validation, transformation or a contract needs them — never one per layer by default — and carry data with no database access or side effects; use cases hold the business rules; models represent persistence and entity behavior; response serializers are the one layer that shapes API responses, so models and internal structures are never exposed directly; repositories exist only for a real persistence abstraction; React components keep one concern.  The pipeline is tied to it at the three points that carry decisions into code:

- `/04-tech-plan` loads it before writing Decisions and records one row per rule naming the stack's mechanism (folders per layer, validation, resource classes, OpenAPI generator), with each endpoint's form request, action/service and resource in the traceability matrix. Only the requester overrides a rule, and their words are recorded.
- `/06-tickets` names the form request, DTOs, service/action, resource, any repository with its reason, and the component split in each ticket's Implementation contract, and its Done when carries the applicable checks.
- `/07-build` briefs backend, API and UI builders to load and follow it, and the evaluator applies its RED list.

`/00-start-here` names the standards in its conventions. The seed attaches a new skill only to profiles named "Padrão", so the local "Desenvolvimento de sistema" profile, and any profile that already includes `07-build`, had the skill added so the stages that load it are not refused.

## Alternatives considered

**Name SOLID as the rule.** Replaced: a principle's name leaves each agent to interpret it, and it pushed toward a repository interface for every model; responsibilities per layer, with explicit "do NOT" lines, are checkable by the evaluator and keep repositories to real needs.

**Backend rules written in Laravel terms.** Replaced: Form Requests, API Resources and Horizon tied the rules to one language. Roles are named instead, and the stack's constructs are recorded in the plan; the frontend keeps its fixed stack because it does not vary between projects.

**Technology named inside the rules ("use Tailwind", "use Recharts").** Replaced: it mixed architecture with technology. The rules state the obligation; the stack rules name the tool, so another stack records its equivalent without rewriting the rules.

**"Always configure Swagger" as the documentation rule.** Replaced: it names a tool, not the obligation. The rule now requires formal, up-to-date documentation of every public API contract — inputs, outputs, errors, authentication and HTTP status codes — with OpenAPI and Swagger UI as the default format, and defines public, formal and up to date so the evaluator can check them.

**A data transfer object between every layer.** Replaced: it multiplied classes that only copied fields; an explicit object is required where a boundary needs decoupling, validation, transformation or a contract, and the plan names which boundaries those are.

**The workspace `AGENTS.md`.** Kept for per-project exceptions, not chosen as the home: it must be copied into every workspace, and the evaluator does not judge against it unless the plan cites it.

**Instructions in chat at the start of each project.** Rejected: they do not reach the subagents or the evaluator, and they are lost to compaction.

**Rules inside `04-tech-plan` itself.** Rejected: the builders and the evaluator need the same text, and a separate skill is loaded where each needs it without duplicating it into three stages.

## Consequences

- Every plan records the standards as Decisions, every ticket checks them, and a violation fails evaluation.
- A deployed plugin manager seeds the skill into the library, but profiles not named "Padrão" must add it in the panel before their pipeline can load it.
- The rules assume an HTTP API and a React front end; a project without one records why the matching rule does not apply.
