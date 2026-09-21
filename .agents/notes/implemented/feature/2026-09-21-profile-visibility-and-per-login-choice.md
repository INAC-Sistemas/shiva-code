# Agent Note: Public and private profiles, several active, chosen at each sign-in

Status: implemented

## Problem

A plugin-manager user had one "active" profile, `User.activeProfileId`, could see only their own profiles, and the Shiva Code picker followed that id silently, asking only when none existed. The product needs profiles shared across users and several of them available at once: each user creates profiles, marks each one public (any user may use it) or private (owner only), and active or inactive; after every sign-in, Shiva Code must ask which available profile to use before the app can be used. A related defect also surfaced: the picker compared only the profile id, so a profile renamed or edited in the panel kept its stale name and plugin list on the machine.

## Decision

**Two profile attributes.** `Profile.visibility` (`PRIVATE` | `PUBLIC`, default `PRIVATE`) and `Profile.status` (`ACTIVE` | `INACTIVE`, default `ACTIVE`). Only the owner edits, toggles, or deletes a profile. Migration `20260921120000_profile_visibility_status` keeps existing profiles private and active.

**"Active" now means available; the user's choice is the selection.** `User.activeProfileId` is renamed `selectedProfileId` (a column rename, so current choices survive), the route `POST /api/profiles/active` becomes `POST /api/profiles/selected`, and `GET /api/profiles` answers `selectedId`. The pre-release stance allows the rename without a compatibility alias.

**One selectability rule.** `selectableWhere(userId)` in `plugin-manager/plugins/profile` — `status = ACTIVE AND (userId = caller OR visibility = PUBLIC)` — filters the roster (`listProfiles`), the selection write (`setSelectedProfile`, the panel's `selectProfile`), the resolved selection (`readSelectedProfileId`), and the skill library (`scopedWhere`). A selection that stops being selectable (deactivated, made private, deleted) resolves as `null`, so the library serves no skills and the shell reopens the picker. Roster rows carry `visibility`, `status`, `isOwn`, and `ownerName`; owner names disambiguate public profiles, since names are unique only per owner. Creating a profile no longer selects it.

**A new sign-in is detected from the login session.** `dsh-login` stores `grantedAt` with each session: a restored session keeps it, a new sign-in replaces it, and a record without it reads as `0`. The picker sends that value with each selection, and the host half stores it in `profile/active.json` as `loginGrantedAt` (`-1` when absent). `planFrom(state, grantedAt)` asks, with no Cancel, when the two differ, taking the only selectable profile without asking; within the same login it materializes a selection changed elsewhere or a `revision` bump from a panel edit, and asks again when the selection is no longer in the roster.

**Panel.** The profile form has Visibilidade and Estado choices; the list shows status, visibility, and "em uso" badges with Ativar/Desativar; a "Perfis públicos de outros usuários" section offers other owners' public active profiles with a "Usar" button.

## Alternatives considered

**Keep one active profile per user and add sharing only.** Rejected: the requirement is several available profiles with a choice at each sign-in, and reusing "active" for the choice would leave the panel's "ativo" meaning two things.

**Ask the server for a per-login selection.** Rejected: tokens are stateless JWTs with no login record, and the selection is deliberately per user so every request resolves the same slice. A fresh sign-in is a client-side fact, so the shell detects it.

**Key a new login on the token string.** Rejected: storing the token, or a hash of it, in `active.json` puts credential material on disk outside `dsh-login`, while a timestamp carries no secret.

**Admin-owned profiles assigned to users.** Rejected by the product owner: every user creates and publishes profiles themselves.

## Consequences

- Every sign-in shows the picker unless exactly one profile is selectable; reopening the app on a stored session does not.
- Any user can run with another owner's public profile, including skills that owner selected; the slice still only narrows the published library.
- The first start after this change asks once even on a stored session, because older `active.json` records carry no `loginGrantedAt`.
- The plugin manager and the shell must ship together: the route rename, `selectedId`, and the new roster fields have no compatibility path.
