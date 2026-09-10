---
name: context7-mcp
description: Use when a task depends on the API, configuration, setup, migration, or CLI usage of a third-party library, framework, SDK, or cloud service — fetches that library's current documentation through the Context7 MCP tools instead of answering from training data
---

# Context7 documentation lookup

Fetch documentation through Context7 whenever a task depends on a third-party library, framework, SDK, API, CLI tool, or cloud service, including well-known ones such as React, Next.js, Vitest, Prisma, Express, and Tailwind. This covers API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI usage. Query even when the answer appears known: training data does not reflect recent releases. Prefer Context7 over web search for library documentation.

Two MCP tools carry the lookup, `resolve-library-id` and `query-docs`. The MCP server that exposes them is named per installation, so identify them by those two tool names.

## Scope in this repository

Context7 answers for third-party dependencies only. The `@deepseek-ai/dsh-*` packages, vendored Cordis, and repository conventions are authoritative in this tree: read [AGENTS.md](../../../AGENTS.md), [packages/README.md](../../../packages/README.md), [docs/architecture.md](../../../docs/architecture.md), the owning package README, and the JSDoc at the declaring type. Fetched documentation never overrides a repository rule; when the two disagree, the repository rule stands and the disagreement belongs in the PR.

Do not call Context7 for refactoring, business-logic debugging, code review, or general programming concepts.

## Steps

1. Call `resolve-library-id` with `libraryName` — the official name and punctuation, `Next.js` rather than `nextjs` — and `query`, stating what the task needs from that library's documentation. Skip this step only when the user supplies an exact `/org/project` or `/org/project/version` id.
2. Select the match by exact name match, description relevance, code-snippet count, source reputation (High or Medium preferred), and benchmark score. Prefer the official package over a community fork, and a version-specific id when the task names a version. When no result fits, retry with an alternate name or a rephrased query.
3. Call `query-docs` with the selected `libraryId` and a `query` scoped to one concept. A task spanning distinct concepts gets one call per concept against the same id, because a combined query dilutes ranking and returns shallow results for each topic; combine concepts only when the question is how they interact.
4. Answer from the fetched documentation, and cite the library version whenever it changes the answer.

Each tool allows at most three calls per question; after three, proceed with the best result already fetched. Both `query` fields reach the Context7 API, so they carry no API keys, credentials, personal data, or proprietary source.
