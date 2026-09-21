# Agent Note: Public and private profiles, several active, chosen at each sign-in

Status: implemented

## Problem

A plugin-manager user had one "active" profile, `User.activeProfileId`, could see only their own profiles, and the Shiva Code picker followed that id silently, asking only when none existed. The product needs profiles shared across users and several of them available at once: each user creates profiles, marks each one public (any user may use it) or private (owner only), and active or inactive; after every sign-in, Shiva Code must ask which available profile to use before the app can be used. A related defect also surfaced: the picker compared only the profile id, so a profile renamed or edited in the panel kept its stale name and plugin list on the machine.

## Decision

**Two profile attributes.** `Profile.visibility` (`PRIVATE` | `PUBLIC`, default `PRIVATE`) and `Profile.status` (`ACTIVE` | `INACTIVE`, default `ACTIVE`). Only the owner edits, toggles, or deletes a profile. Migration `20260921120000_profile_visibility_status` keeps existing profiles private and active.

**"Active" now means available; the user's choice is the selection.** `User.activeProfileId` is renamed `selectedProfileId` (a column rename, so current choices survive), the route `POST /api/profiles/active` becomes `POST /api/profiles/selected`, and `GET /api/profiles` answers `selectedId`. The pre-release stance allows the rename without a compatibility alias.

**One selectability rule.** `selectableWhere(userId)` in `plugin-manager/plugins/profile` — `status = ACTIVE AND (userId = caller OR visibility = PUBLIC)` — filters the roster (`listProfiles`), the selection write (`setSelectedProfile`, the panel's `selectProfile`), the resolved selection (`readSelectedProfileId`), and the skill library (`scopedWhere`). A selection that stops being selectable (deactivated, made private, deleted) resolves as `null`, so the library serves no skills and the shell reopens the picker. Roster rows carry `visibility`, `status`, `isOwn`, and `ownerName`; owner names disambiguate public profiles, since names are unique only per owner. Creating a profile no longer selects it.

**A new sign-in is detected from the login session.** `dsh-login` stores `grantedAt` with each session: a restored session keeps it, a new sign-in replaces it, and a record without it reads as `0`. The picker sends that value with each selection, and the host half stores it in `profile/active.json` as `loginGrantedAt` (`-1` when absent). `planFrom(state, grantedAt)` asks, with no Cancel, when the two differ, taking the only selectable profile without asking; within the same login it materializes a selection changed elsewhere or a `revision` bump from a panel edit, and asks again when the selection is no longer in the roster.

**A restart keeps the login.** Selecting a profile whose host-plane plugins differ restarts the harness. `HarnessRuntime` remembers the previous port and `reservePort(preferred)` tries it first, falling back to a free one only when it is taken. The web client keeps its login session in `localStorage`, which is keyed by origin, so a restart on a new port used to sign the user out and, under the per-login rule, ask for the profile a second time. A change of profile also opens a new conversation, because an open session keeps the composition it started with: the picker clears the client's open-session selection before a restart, or calls `startSession()` when no restart is needed; a `revision` refresh of the same profile keeps the conversation.

**A skill outside the selected profile is refused, and the model says so.** `GET /api/plugins/skill-library/skills/<name>` answers `403` `{ code: "skill-not-in-profile" }` for a published skill outside the selection (or with nothing selected); unknown and unpublished names still answer `404` alike. Because the catalog lists only profile skills, the `skill` tool reports any other name as unknown without reaching the library, so `dsh-skill-library` listens to `tools/post-execute`: on a failed `skill` call it asks the body endpoint, and on that `403` it blocks the result with text telling the model the profile does not cover the tool and that the user can switch profiles or ask the owner. `LibrarySkillProvider.get()` maps the same `403` to the same text for a catalog that went stale.

**Plugin routes require their plugin in the selected profile.** `authenticatePluginRequest(request, pluginId)` in `plugin-manager/src/lib/plugin-auth.ts` authenticates the token and then requires `pluginId` in the selected profile's plugins, answering `403` `{ code: "plugin-not-in-profile", plugin }` otherwise (or with nothing selected). `host-info` requires `dsh-vps-status`, `skill-library/*` requires `dsh-skill-library`, and `prototype/*` requires `dsh-prototype`; `/api/plugins/profile` is exempt because the shell reads the selection through it. `dsh-vps-status` maps that `403` to text telling the model the profile does not cover the tool, and `dsh-skill-library` treats it as an authoritative empty catalog and a refusal on body loads. `dsh-prototype` ships only built output here, so its tool still reports the `403` as a rejected session.

**Adding a workspace asks about the profile first.** The desktop patch for `@deepseek-ai/dsh-client-ui-workspace` marks the workspace browser's add button `data-dsh-action="add-workspace"`; `dsh-profiles` intercepts that click in the capture phase and shows a modal with "Mudar de perfil" (opens the picker) and "Seguir no mesmo perfil" (replays the click into the package's own flow). The package exposes no hook for this, and the marker keeps the interception independent of the translated label.

**The desktop supplies its own `profile` agent preset.** The packaged harness ships only `cordis`, `minimal`, `ptc`, and `standard`, so no desktop session received the skill library or `vps_status`. `desktop/build/agent-presets/profile` is the installed `standard` preset copied verbatim plus the two profile-gated rows; the `agent-presets` row in `dsh-desktop.patch.yml` adds that root through `$DSH_DESKTOP_PRESET_ROOT` and makes `profile` the default. `desktop/test/agent-presets.test.ts` fails when the copy drifts from the installed `standard`.

**Pipeline stages load in order.** Each numbered system-development `SKILL.md` states its prerequisites in `whenToUse` (visible in the catalog) and ends with a `## Next` section naming the following stage. `dsh-skill-library` also enforces the order: its `prerequisites` config maps a skill to the skills that must have loaded earlier in the same session, a `tools/pre-execute` listener denies a `skill` call whose prerequisites are missing, and "loaded" is read from the session log (a `skill` call whose result did not fail). The `profile` presets configure the chain `00 → 01 → 02 → 03 → 04 → 06 → 07 → 08`, each stage requiring `00-start-here` and the previous stage, with `05-debate` optional after `04` and `10`/`11` requiring only `00`. A new session resumes by loading `00` and the previous stage again, rather than the whole chain, so continuing an epic stays cheap.

**Panel.** The profile form has Visibilidade and Estado choices; the list shows status, visibility, and "em uso" badges with Ativar/Desativar; a "Perfis públicos de outros usuários" section offers other owners' public active profiles with a "Usar" button.

## Alternatives considered

**Keep one active profile per user and add sharing only.** Rejected: the requirement is several available profiles with a choice at each sign-in, and reusing "active" for the choice would leave the panel's "ativo" meaning two things.

**Ask the server for a per-login selection.** Rejected: tokens are stateless JWTs with no login record, and the selection is deliberately per user so every request resolves the same slice. A fresh sign-in is a client-side fact, so the shell detects it.

**Key a new login on the token string.** Rejected: storing the token, or a hash of it, in `active.json` puts credential material on disk outside `dsh-login`, while a timestamp carries no secret.

**List out-of-profile skills in the catalog, marked unavailable.** Rejected: the catalog is prompt-visible on every step, so every excluded skill would cost context and invite the model to try it. Probing only after a failed call costs one request per refusal.

**Change the `skill` tool's unknown-name error in `dsh-tool-skill`.** Rejected: the profile is a plugin-manager concept, and the tool registry's `tools/post-execute` waterfall is the documented place for a plugin to replace a result.

**Admin-owned profiles assigned to users.** Rejected by the product owner: every user creates and publishes profiles themselves.

## Consequences

- Every sign-in shows the picker unless exactly one profile is selectable; reopening the app on a stored session does not.
- Any user can run with another owner's public profile, including skills that owner selected; the slice still only narrows the published library.
- The first start after this change asks once even on a stored session, because older `active.json` records carry no `loginGrantedAt`.
- The plugin manager and the shell must ship together: the route rename, `selectedId`, and the new roster fields have no compatibility path.
