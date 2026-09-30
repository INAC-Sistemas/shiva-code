# Agent Note: delegated children can run on their own agent preset

Status: implemented

## Problem

The product owner asked for development split across role agents:
- a project-manager main agent that gathers features, architecture, and stack, and breaks the work into one task per page;
- backend, frontend, and tester subagents, each with its own session, persona, tools, and skills.

The goal is that every model request carries only the calling role's context.

Before this change, every in-process child joined its parent's standing preset composition (`applyChildComposition` → `agentPresets.composeFrom`). A child therefore saw the parent's tools, prompt sections, and skills. The per-child levers could not isolate a role:
- `persona` shadows only `deployment:persona-prefix`;
- `toolFilter` narrows tools but cannot remove the parent's prompt sections or filter skills.

## Decision

**A delegation may name an `agentPreset`.** The child mounts that preset instead of joining its parent's composition, so its tools, prompt sections, and skills are the preset's alone.

**Plumbing through the seam:**
- **Request:** `SubagentStartRequest.agentPreset` is gated by the new `SubagentCapabilities.agentPreset` flag. The flag is checked for one-shot starts and for `startContinuable`.
- **Providers:**
  - spawn advertises the flag;
  - fork refuses it, because its seed was produced under the parent's tools;
  - out-of-process providers refuse it too.
- **Tool config:** `dsh-tool-subagent` exposes the field as the instance config `agentPreset`.

**Prepare, then join.**
- The in-process drivers compose children inside a synchronous creation `setup`, where `AgentPresets.mount()` cannot be awaited.
- `AgentPresets.prepareJoin(id)` resolves and mounts the preset before creation. `joinPrepared()` then binds the child synchronously to that exact standing generation.
- `prepareChildComposition()` wraps both steps. Any failure (unknown preset, broken composition, no roster) rejects with `AGENT_PRESET_UNAVAILABLE` before a child exists.
- `applyChildComposition()` accepts only the prepared value, so skipping preparation does not type-check.

**Durable record.**
- The child header's `agentPreset` names the role preset.
- A continuable child with its own preset writes descriptor version 4, which is version 3 plus a required `agentPreset`. Cold resume remounts the same preset.
- Children without a preset keep writing version 3. Existing children and older runtimes are unaffected, and no recorded session changes.

**Supporting tool config.** Three settings let one composition offer role delegation tools:
- `outputSchema` returns a validated `structured` value from a foreground one-shot delegation, which the tester uses for its verdict;
- `toolDescription` gives each delegation tool role-specific wording;
- `hidden: true` in `preset.yml` keeps role presets out of the top-level picker while they still mount by id.

**The team compositions.** The CLI preset root `apps/cli/config/agent-presets/` gains four presets:

| Preset | Role | Model-facing surface |
|---|---|---|
| `team` | Project manager (selectable) | File tools for `mds/`, `ask_user_question`, `todo_write`, `web_search`, `send_message`/`interrupt_agent`/`list_agents`, and three delegation tools |
| `team-backend` (hidden) | Backend developer | Shell, file tools, jobs, `send_message`/`interrupt_agent`, `todo_write`, skills |
| `team-frontend` (hidden) | Frontend developer | Same as backend |
| `team-tester` (hidden) | Tester | Shell, file tools, jobs, `todo_write`, skills; no messaging, because its verdict is its answer |

The three delegation tools differ in mode:
- `delegate_backend` and `delegate_frontend` are continuable, so a page's fixes return to the agent that built it;
- `delegate_tester` is one-shot and foreground, and returns the verdict schema `{status, side, evidence, failingTests}`.

`verify-cordis-config` fails when a delegation row names a preset that is not a sibling directory.

**Skills per role come from the VPS library.**
- `LibrarySkill.roles` (migration `20260929120000_library_skill_roles`) tags a skill with `pm`, `backend`, `frontend`, or `tester`.
- The `dsh-skill-library` client sends its configured `role` as `?role=`. The server then serves only the selected profile's skills tagged with that role:
  - an unknown role answers 400;
  - a profile skill of another role answers 403 `skill-not-in-role`;
  - a read without `role` ignores the column, so the `profile` preset and the three-stage pipeline are unchanged.
- The new skills live in `plugins/dsh-skill-manager/skills/team/`:
  - `pm-start-here`, `pm-architecture` (derived from `01-arquitetura`), and `pm-page-loop`;
  - `backend-page`, `frontend-page`, and `tester-page`.
- The existing helper skills are tagged with the roles that use them.

## Alternatives considered

**Out-of-process `dsh-sdk` children per role.**
- It isolates everything, but it is one-shot only.
- It starts a process per run.
- It loses the continuable backend and frontend children the manager steers with fixes.

**Per-child skill filter.** A second filtering mechanism beside presets would still leak the parent's prompt sections. A preset already owns tools, sections, and skills together.

**Tester delegates fixes itself.** `send_message` only links a parent with its direct child. A tester-spawned fixer would also lose the original builder's context. The tester therefore returns `{side, evidence}`, and the manager steers the page's existing continuable child.

## Consequences

- The desktop runs the packaged harness `0.1.2-alpha.4`, which predates this change. Patches under `desktop/patches/` port it to the packaged JS of `dsh-agent-presets`, `dsh-subagent`, `dsh-subagent-in-process-driver`, `dsh-subagent-spawn-in-process`, and `dsh-tool-subagent`, and `desktop/test/role-presets-patch.test.ts` proves the behavior on those modules. The packaged declarations are not patched.
- `desktop/build/agent-presets/team*` equal the CLI copies except two lines, which `desktop/test/agent-presets.test.ts` pins:
  - the packaged persona row takes `text` instead of `prefix`;
  - the tester row sets `guardRole: qa`, so `dsh-tool-guard` limits its writes to `testes/`.
- The packaged tool-subagent forwards `guardRole` through `agentOptions`, which a continuable descriptor does not record. The developer rows therefore bind no guard role, because a cold-resumed fixer would lose it.
- The seed attaches new skills only to profiles named "Padrão". Other profiles need the team skills selected in the dashboard before role agents receive them.
- A role preset must mount every model-facing row its role needs, including `tool-subagent-control` when the child should message its parent.
- Host-plane tools on the registry's global layer remain visible to every preset. Role compositions that must hide them need those rows on the agent plane.
