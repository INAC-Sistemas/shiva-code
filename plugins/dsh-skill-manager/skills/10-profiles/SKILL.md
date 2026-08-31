---
name: 10-profiles
description: Multiuser profiles (KISS) — switch or create a user profile to choose which better-sidebar plugins, preset and skills are in play; see /00-start-here for the process context.
whenToUse: When the user wants to isolate a work style (e.g. games vs web) into a profile, or to log out and switch profiles.
---

# Profiles

KISS multiuser profiles: one dsh, one home, and a **profile** that decides which better-sidebar tabs (and, by extension, which skills/preset) are in play for the person using it.

## Concepts

- **Profile** = `{ id, label, preset, plugins[], skills[] }` stored in `~/.dsh/profiles/profiles.json`.
- **No active profile** → dsh opens on a full-screen picker (list + Criar perfil modal).
- **Active profile** → dsh runs normally; a **Perfil** button in the sidebar footer logs out / switches (clears active → `location.reload()` → picker).
- Plugin visibility is driven by `window.__profileTabEnabled(id)`; absent profiles or an empty roster → everything visible.

## Using it

1. **Create a profile**: on the picker, **Criar perfil** → label, id (kebab), default preset, tick the plugins, list skill folders. *Example: a `Games` profile with `MDS` + `Kanban`; a `Web` profile with `Prototype`, `Memory`, `Kanban`, `Skills`.*
2. **Enter** a profile → the dsh mounts with only that profile's plugins; `location.reload()` applies it.
3. **Logout / switch**: sidebar footer **Perfil → Sair / trocar perfil** → clears active → back to the picker.

## Related

- `/00-start-here` — process conventions (this file is a helper, not a pipeline stage).
- Profiles don't isolate data (same home); by design. For real isolation run separate `$DSH_HOME` instances.
- Skill-root scoping per profile is a documented follow-up; tab visibility is what profiles gate today.
