# dsh-profiles

KISS multiuser profiles for dsh: a gate screen with a list of user profiles, each with its own preset, skills and visible better-sidebar plugins. Logging out returns to the picker; switching is a reload.

## How it works

- One dsh, one home. A profile is just a fact that decides **which better-sidebar tabs appear, which skills/preset are in play** for the person using it.
- **No profile active** → dsh opens on a full-screen picker: list of profiles + **Criar perfil** (modal: label, id, default preset, plugin checkboxes, skill folders). Entering one sets it active and reloads.
- **Profile active** → dsh runs normally; a **Perfil** button in the sidebar footer lets you log out / switch (clears active → reload → picker). Only the plugins listed in the profile register their tabs.

## Profile model (`~/.dsh/profiles/profiles.json`)

```json
{ "profiles": [ { "id": "games", "label": "Games", "preset": "default",
    "plugins": ["dsh-mds:artifacts", "dsh-prototype:view"],
    "skills": ["~/.dsh/skills/games"], "createdAt": "..." } ], "active": null }
```

## API

`POST /profiles/api/<method>` (same-origin): `bootstrap` (active + rosters), `list`, `create`, `update`, `delete`, `setActive`, `logout`.

## Plugin filtering

On boot the client publishes `window.__profileTabEnabled(id)`; every in-tree better-sidebar plugin calls it before registering its tab. Absent `dsh-profiles` (or no active profile) the helper returns `true`, so nothing is hidden.

Sample: create a `Games` profile with only `MDS` + `Docs Panel`; your `Web` profile can enable `Prototype`, `Memory`, `Skills` — each person logs in and sees just their stack. (Skill-root scoping per profile is a documented next step; today all user skills remain discoverable while tab visibility is per-profile.)

MIT.
