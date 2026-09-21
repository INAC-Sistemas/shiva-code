---
name: engineering-standards
description: The house engineering standards every system built here follows — backend rules that hold in any language (clear responsibilities per layer, explicit data transfer objects where a boundary needs them, repositories only when needed, responses serialized by a layer dedicated to external representation, formal and up-to-date documentation of every public API contract, asynchronous processing for long, heavy or external work), a consistent design system with reusable tokens and one standardized visualization library, and the frontend stack (React, Tailwind CSS, Recharts) — with what /04-tech-plan records, what /06-tickets requires, and what the /07-build evaluator rejects.
whenToUse: In /04-tech-plan before writing Decisions, in /06-tickets when writing each ticket's Implementation contract and Done when, and in /07-build for every builder and evaluator briefing of a backend, API or UI ticket.
---

# Engineering standards

These rules are not options to weigh: they apply to every system unless the requester explicitly overrides one (record their words). The backend rules name roles, not frameworks, so they hold in any backend language: `/04-tech-plan` maps each role to the chosen stack's concrete mechanism (see "Backend: mapping roles to a stack"), `/06-tickets` turns the rules into checks per ticket, and the `/07-build` evaluator marks a violation RED. The frontend stack is fixed: React, Tailwind CSS and Recharts.

## The rules

### 1. Layer responsibilities

Each layer has one job. The names below are roles; every backend stack has a construct for each (see the mapping table), and the plan names it.

**Controllers** (request handlers)
- receive the request;
- delegate the execution;
- return the response;
- do NOT contain business rules;
- do NOT access multiple repositories directly;
- do NOT perform complex transformations;
- do NOT make external calls directly.

**Request validators**
- validate the input;
- authorize the request when that belongs to the request itself;
- do NOT execute business rules.

**Data transfer objects**
- use explicit data transfer objects to carry data across architectural boundaries when there is a need for decoupling, validation, transformation, or contract definition — for example between an HTTP request and a use case, between the application and an external API or queue, or where a model's shape must not become a public contract;
- where there is no such need, pass the validated input or the model itself; do NOT create a DTO for every layer by default;
- a data transfer object only carries data: it does NOT access the database and does NOT have side effects.

**Use cases** (services or actions)
- execute the use cases;
- contain the business rules;
- coordinate multiple operations when needed.

**Models** (domain or persistence entities)
- represent persistence and relationships;
- encapsulate behavior directly tied to the entity;
- do NOT take on responsibilities of the whole application.

**Response serializers**
- serialize what the API sends out, and nothing else: they are the only place that decides how internal data is represented externally;
- do NOT expose models or internal structures directly;
- do NOT execute business rules.

**Repositories**
- only when there is a real need to abstract persistence;
- do NOT create a Repository just by default.

**UI components** follow the same idea: one concern each. A page composes; data loading lives in a hook (`useExpenses`) or query function; presentational components receive props and render. A component that fetches, transforms and renders a large tree at once is split.

### 2. Response serialization

- API responses are serialized by a layer responsible exclusively for representing data externally, so models and internal structures are never exposed directly (the plan names the stack's mechanism).
- Internal structures include models and ORM results, raw query rows, internal ids and flags not meant to be public, and fields added for persistence; the serialization layer chooses, names and formats exactly the fields of the external contract.
- The serialization layer only represents data: it does not query, compute business results or change state.
- One envelope for the whole API: success `{ "data": …, "meta": { … } }` (lists carry pagination in `meta`), error `{ "error": { "code": "…", "message": "…", "details": [ … ] } }` with the matching HTTP status.
- Error codes are stable identifiers the frontend can switch on; messages are for people.

### 3. API contract documentation

Every public API has formal, up-to-date documentation of its contracts, including inputs, outputs, errors, authentication and HTTP status codes.

- **Public** means consumed by anything outside the service that serves it: the product's own frontend, another service, a mobile app, a partner. Only code called in-process is exempt.
- **Formal** means a machine-readable specification, not prose: OpenAPI (rendered with Swagger UI, for example at `/docs`) for HTTP APIs, whatever the backend language; an API of another kind (GraphQL schema, AsyncAPI for events) records its format in the plan.
- **Up to date** means generated from the code or checked against it in the build, so the document cannot drift from what the API actually does. An endpoint missing from it, or described differently from its behavior, is unfinished.
- **Per endpoint** it covers: the input (path, query and body fields, with types, required fields and examples), the output (the serialized response of rule 2, per status), every error response with its code and envelope, the authentication or authorization it requires, and each HTTP status code it can answer.

### 4. Design system

The visual presentation uses a consistent design system, with reusable tokens for colors, typography, spacing, dimensions and components.

- **Colors** are the palette roles recorded in `03-palette.md` (`skill ui-palette`); **typography and motion** come from `03-design.md` (`skill frontend-design`); **spacing, dimensions and radii** follow one scale; **components** come from one component library, reused rather than rebuilt per screen.
- Screens reference tokens, never one-off values: no color literal, no arbitrary spacing or size where a token exists, no second component written for a need an existing component covers.

### 5. Data visualization

When the application needs graphical visualizations, use a visualization library that is appropriate and standardized for the project, avoiding multiple libraries for the same purpose.

- The plan names the library once; every chart of that kind uses it.
- Charts take their colors, fonts and spacing from the design system's tokens (rule 4), never literals.
- A second library for the same purpose needs a recorded reason (a chart type the standard one cannot draw).

### 6. Asynchronous processing

Operations that are long-running, resource-intensive, externally dependent, or not required to complete before responding to the caller are executed asynchronously. Asynchronous operations must not unnecessarily block the request/response lifecycle: when an operation can be safely executed after the initial request has completed, it is delegated to a background task processed by an asynchronous execution mechanism.

Typical candidates: sending emails or notifications; processing uploaded files; generating reports; image or video processing; importing or exporting large datasets; communicating with slow external services; processing large collections of records; scheduled or recurring operations; resource-intensive calculations; synchronization with external systems.

**When a reliable queue is required.** Use a reliable task queue or an equivalent mechanism — not a fire-and-forget call after the response — when the operation needs delayed execution, retry, failure recovery, workload distribution, controlled concurrency, rate limiting, prioritization, or horizontal scaling.

**How tasks are shaped.** Background tasks are designed to execute independently and never depend on the original request remaining active. Each task is:
- small and cohesive;
- independently executable;
- observable;
- retryable when appropriate;
- safe to execute more than once when possible;
- idempotent when the operation can be repeated.

**What a task carries.**
- Identifiers and the minimal data needed, never whole models or large serialized structures: the task reloads the current state when it runs, and handles a record that was deleted or changed in the meantime.
- No secrets or credentials in the payload; the task reads them from configuration.
- Anything that must not run twice (a charge, an external write) carries an idempotency key or is guarded by a uniqueness check.

**When a task is dispatched.**
- After the transaction that produced its data commits — never from inside an open transaction, where the worker could run before the data exists or for data that is later rolled back.
- When a database change and a message to another system must both happen, record the message in the same transaction (a transactional outbox) and publish it from a task.
- Order is not assumed: tasks that must run in sequence are chained explicitly, and a group whose completion matters is tracked as a batch.

**Limits and failure.**
- Every task declares a timeout, a maximum number of attempts, and a backoff between attempts.
- Errors that retrying cannot fix (invalid input, a missing record, a 4xx from an external API) fail immediately instead of consuming retries.
- A task that exhausts its attempts lands in a failed-task store with its error, is reported (log and alert), and can be retried by hand; its failure handler leaves the domain in a consistent state (for example, marks the import as failed).
- Queues are separated by workload or priority when one kind of task could starve another (bulk imports vs. password-reset emails).

**Observability and feedback.**
- Tasks log start, finish and failure with the task id and a correlation id carried over from the request.
- When the caller or the user waits for the result of a long operation, the API answers **202 Accepted** with a status resource (serialized per rule 2) that the client polls or is notified about; the status shows queued, running, progress when known, finished with a result link, or failed with a reason the user understands.

**Scheduled and recurring tasks** run on a single instance and never overlap with a previous run still in progress; a missed run is either caught up or recorded as skipped, deliberately.

**Testing.** A task's handler is testable by running it directly; tests assert that the request dispatches the right task with the right payload, and exercise the task's retry, idempotency and failure paths.

**Do not go asynchronous by default.** Do not move an operation to asynchronous execution solely for architectural purposes. Synchronous execution is preferred when the operation is short-lived and the caller requires its result immediately.

## Backend: mapping roles to a stack

The backend rules hold in any language; the plan records how the chosen stack realizes each role. The table only illustrates — it is not a list of allowed stacks.

| Role | Laravel (PHP) | NestJS (TypeScript) | Spring Boot (Java/Kotlin) | ASP.NET Core (C#) | Django REST / FastAPI (Python) | Go |
|---|---|---|---|---|---|---|
| Controller | Controller | `@Controller` | `@RestController` | Controller / minimal API handler | ViewSet / path operation | HTTP handler |
| Request validator | Form Request | DTO + `class-validator` pipe | `@Valid` request class | FluentValidation / DataAnnotations | Serializer / Pydantic model | request struct + validator |
| Use case | Action / Service | Provider (service) | `@Service` | Service / MediatR handler | service module | service |
| Response serializer | API Resource | response mapper / `class-transformer` | response DTO + mapper | response record + mapper | Serializer / response model | response struct + mapper |
| API specification | Scramble / `l5-swagger` | `@nestjs/swagger` | springdoc-openapi | Swashbuckle / NSwag | drf-spectacular / built-in OpenAPI | swaggo / oapi-codegen |
| Background tasks | Queued Jobs + Horizon | BullMQ | Spring Batch / a message broker consumer | Hangfire / a hosted worker | Celery / RQ | asynq / a broker consumer |

Whatever the stack, the plan names for rule 6 the queue mechanism, where timeouts, attempts, backoff and failure handlers are declared, how a task is dispatched only after commit, how scheduled tasks are kept from overlapping, and the worker process in the deployment.

## Frontend stack

The frontend is React. It implements the rules as follows.

- **Rule 1**: UI components as described there; data loading in hooks or query functions (TanStack Query when the app fetches server state).
- **Rule 4**: the design system is implemented with **Tailwind CSS** — utilities plus the theme CSS variables from `skill ui-palette` — and components from **shadcn/ui** (`skill shadcn-ui`). No CSS modules, CSS-in-JS, styled-components, or inline `style` except for a genuinely dynamic value (a computed width, a chart color variable); no default Tailwind color standing in for a palette role.
- **Rule 5**: the standard chart library is **Recharts** (https://recharts.github.io/en-US/guide/), through the shadcn/ui `chart` component (`ChartContainer`, `ChartTooltip`) when shadcn is in use — it is built on Recharts. Series colors come from the `chart-1` … `chart-5` variables. No Chart.js, ECharts, Nivo, D3-rendered or hand-drawn SVG charts in the app. (The CDN-only prototype of `/03-prototype` may use a CDN chart library; the app does not inherit it.)
- **Rule 6**: a long operation's status is shown by polling its status resource (TanStack Query `refetchInterval`) or through server push (WebSocket or Server-Sent Events) when the plan records real-time needs; the screen shows the queued, running, progress, done and failed states (`skill react-ui-patterns`).

## In /04-tech-plan

Record the backend language and framework, then add one **Decisions** row per rule naming how that stack realizes it (the mapping table above shows examples):

| Decision | Choice |
|---|---|
| Layers | the folder or module of each role (controllers, request validators, use cases, models, response serializers); repositories only where named, with the reason |
| Data transfer objects | the boundaries that use one and why: decoupling, validation, transformation or contract; "none" is a valid answer |
| Input validation | the stack's request-validation mechanism, and where authorization tied to the request is checked |
| Response serialization | the stack's serializer mechanism as the only layer that represents data externally; envelope `{data, meta}` / `{error}`; the central error handler |
| API contract documentation | OpenAPI generated from the code by the stack's generator (or checked in the build), Swagger UI at `/docs` |
| Design system | tokens: colors from `03-palette.md`, typography and motion from `03-design.md`, the spacing/radius scale; implemented with Tailwind CSS + shadcn/ui, theme CSS file named |
| Data visualization | Recharts via shadcn `chart`, colors from `chart-1` … `chart-5` — or "none" when the product has no charts |
| Asynchronous processing | which operations run in the background and why (rule 6 criteria); the queue mechanism and queues by workload; timeout, attempts and backoff per task; failure handling and alerting; status resource and how the UI follows it; scheduled tasks; the worker process in the deployment — or "none" with the reason |

The traceability matrix names the request validator, use case and response serializer symbols per endpoint, plus the data transfer object where one crosses a boundary. A rule the requester overrides is recorded with their words.

## In /06-tickets

Each ticket's **Implementation contract** names its request validator, use case, response serializer, any data transfer object or repository with the reason it is needed, and the component split — with the stack's actual class or module names. Its **Done when** carries the checks that apply to it:

- [ ] Input validated by `<RequestValidator>`; invalid input answers 422 (or the plan's validation status) in the error envelope.
- [ ] Controller only receives, delegates to `<UseCase>` and returns what `<ResponseSerializer>` produces.
- [ ] Business rules live in `<UseCase>`; any data transfer object only carries data (no database access, no side effects) and exists for the boundary the plan names.
- [ ] Response serialized by `<ResponseSerializer>` in the `{data, meta}` envelope; no model or internal structure is exposed directly.
- [ ] Endpoint documented in the API specification with its input, output, errors, authentication and every HTTP status it answers, matching its behavior.
- [ ] Background work (when the ticket has any): dispatched after commit with ids only; timeout, attempts and backoff set; idempotent where repeatable; failure handled and reported; status visible to the caller when they wait on it; tests assert the dispatch and run the task.
- [ ] UI built from the design system's tokens and components (Tailwind utilities and theme variables only); any chart uses the project's standard library (Recharts).

## In /07-build

Builders of backend, API or UI tickets load this skill with the others the ticket needs. The evaluator's briefing loads it too and marks RED:

- a controller with business rules, direct access to more than one repository, complex transformations, or direct external calls;
- a request validator, data transfer object or response serializer executing business rules, or a data transfer object touching the database or causing side effects;
- a data transfer object created for a boundary with no decoupling, validation, transformation or contract need;
- business rules outside use cases, or a model taking on application-wide responsibilities;
- a repository created by default, with no persistence abstraction it is actually needed for;
- an endpoint exposing a model, an ORM result or another internal structure directly instead of serializing it through the response serializer, or answering outside the envelope;
- a response serializer that queries, computes business results or changes state;
- request data used without its request validator validating it;
- a public endpoint missing from the API specification, or documented without its input, output, errors, authentication or status codes, or differently from how it behaves (open `/docs` or the JSON and compare);
- a component that fetches, transforms and renders a large tree at once;
- a one-off value where a design-system token exists (color literal, arbitrary spacing or size), or a component rebuilt where the library has it;
- styling outside Tailwind and the theme variables;
- a long-running, resource-intensive or externally dependent operation executed inside the request when the caller does not need its result immediately;
- a short operation moved to the background although the caller needs its result right away;
- a background task without timeout, attempts or failure handling; one that is not idempotent although it can run twice; one carrying whole models or secrets in its payload; one dispatched inside an open transaction; a scheduled task that can overlap itself;
- a chart built with a library other than the project's standard one (Recharts), or a second library for the same purpose without a recorded reason.

Frontend quick check: `grep -rnE "styled-components|@emotion|\.module\.css|chart\.js|echarts" <frontend>/src <frontend>/package.json` finds nothing.
