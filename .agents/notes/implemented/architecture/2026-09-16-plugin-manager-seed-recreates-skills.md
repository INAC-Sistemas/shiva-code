# Agent Note: Plugin-manager seed recreates library skills on every deploy

Status: implemented

English | [中文](2026-09-16-plugin-manager-seed-recreates-skills.zh.md)

## Problem

A product skill reached an authenticated agent only as a `LibrarySkill` row selected by the signed-in user's active profile. Adding a `SKILL.md` in the repository did nothing on an existing database: the seed created a missing name and then left the row alone, so an edited file stayed invisible until someone passed `--force-skills` or edited the panel. Production skipped the seed entirely, because the same script also upserted demo users with passwords in source. New skills therefore missed the profile-gated library path unless an operator remembered a manual flag.

## Decision

**Versioned bundles under `plugin-manager/prisma/skills/` recreate `LibrarySkill` rows on every deploy.** `seedSkills` reads each `<name>/SKILL.md`, creates a missing name, and updates description, body, invocation flags, and `published: true` when the file differs, incrementing `revision` only then. The row id is unchanged, so `ProfileSkill` selections survive. A newly created name is attached to every profile named `Padrão`; other profiles stay a manual cut. Panel-only rows whose names have no seed folder are left untouched.

**The authoring path is source then sync then seed.** A new product skill is added at `plugins/dsh-skill-manager/skills/<name>/SKILL.md`, mirrored by `node scripts/sync-skills.mjs` into `plugin-manager/prisma/skills/`, and confirmed with `--check`. The VPS image copies that tree; it does not contain the rest of the monorepo, so the seed cannot read the desktop copy at runtime.

**Production runs the skill seed and skips demo users.** `NODE_ENV=production` (overridable by `SEED_USERS`) omits the bcrypt upsert of accounts whose passwords live in source. `docker/entrypoint.sh` applies migrations and then runs `tsx prisma/seed.ts` before serving. Development still seeds both.

## Alternatives considered

**Keep create-never-update, with `--force-skills` as the only overwrite.** That was the original seed rule, chosen so a container restart would not revert panel edits. It lost because a product skill's source of truth is the repository, a deploy that does not publish the new file leaves the profile-gated library serving stale or missing instructions, and `--force-skills` was a flag nobody ran on production, which did not seed at all.

**Delete every `LibrarySkill` row and insert again.** Recreates content and drops names removed from the seed tree in one step. Rejected because `ProfileSkill` cascades on delete, so every existing profile would lose its selection, and panel-only skills would vanish with them. Updating in place by `name` keeps ids and leaves panel-only rows alone.

**Add a `seeded` column and delete rows that left the tree.** Distinguishes product skills from panel skills so a removed file can disappear from the library. Rejected as a schema change for a case the current authoring path does not need: retiring a product skill is an explicit panel unpublish or delete, not a silent deploy side effect.

**Attach every seeded skill to every profile on deploy.** Makes new files visible without a profile edit. Rejected because a profile is a cut; rewriting non-default profiles would undo deliberate exclusions. Only `Padrão` receives newly created names, which is the profile the seed already fills with the full published library for a user who has none.

**Ship skill bodies in the client plugin package instead of the VPS library.** Avoids the seed. Rejected because a skill is intelligence, the client runs only the shell, and the body is served only for the active profile of the token — the access rule the library already enforces.

## Consequences

A deploy that includes a new or edited `SKILL.md` in the seed tree publishes that body at the next container start, and a client detects the change through `revision`. Panel edits of those same names are overwritten when the file differs; that is the accepted cost of files as the product source of truth.

Production no longer fails closed on an empty library after a first install that has users but never ran seed: skills appear as soon as the entrypoint runs. Demo accounts remain a development-only upsert.

The standing order lives in root `AGENTS.md` and the procedure in `plugin-manager/AGENTS.md`. `scripts/sync-skills.mjs --check` is the drift detector between the desktop copy and the seed tree.
