# Agent Note: Product skills grouped under category folders

Status: implemented

English | [中文](2026-09-17-skill-category-folders.zh.md)

## Problem

The product skills sat flat in `plugins/dsh-skill-manager/skills/<name>/`. With 23 bundles covering the build process, UI design, React quality, and profile management side by side, the directory no longer showed which skills belong to one area, and every future area would add more flat siblings. Both readers of that tree — the plugin-manager seed and the local skill-manager scanner — read exactly one level, so a folder could not be introduced without teaching them.

## Decision

**Bundles live at `skills/<category>/<name>/SKILL.md`, and every current skill is under `system-development/`.** Category names are English kebab-case folders. `node scripts/sync-skills.mjs` already mirrors recursively, so `plugin-manager/prisma/skills/` carries the same layout with no script change.

**A category is only a folder, not a library field.** `LibrarySkill.name` stays unique across the whole library, because `skill({ name })` addresses a skill by name alone; the category exists on disk and never reaches the API, the profile catalog, or the model.

**Both readers descend one level into a directory that has no `SKILL.md`.** In `plugin-manager/prisma/seed.ts`, `listSkillBundles()` returns top-level bundles and category children alike; a second bundle with a `name` already seeded from another category is logged with `console.error` and skipped, since seeding it would overwrite the first row on every deploy. In `plugins/dsh-skill-manager/lib/index.js`, `scanRoot()` applies the same rule, so the skill-manager tab lists and edits the moved bundles in place.

## Alternatives considered

**Store the category as a `LibrarySkill` column.** It would let the dashboard group skills. Rejected for now because nothing consumes a category yet, and a column needs a migration, a frontmatter key, and panel UI with no reader.

**Recurse to any depth.** Rejected because a nested bundle's own subfolders (references, assets) would be scanned as candidate skills; one category level covers the need.

## Consequences

New product skills are created inside a category folder; `plugin-manager/AGENTS.md` states the rule. The skill-manager `create` endpoint still writes to the root of the user scope, where the one-level rule reads it as an uncategorized bundle. Library rows keep their ids, because the seed matches by `name`, so profile selections survive the move.
