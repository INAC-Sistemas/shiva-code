---
name: 10-profiles
description: Profiles owned by the plugin manager — each user has many, each selects which library skills and which client plugins an agent gets; see /00-start-here for the process context.
whenToUse: When the user wants to change what an agent can see or do — which skills reach the model, which plugins load — or to switch between work styles.
---

# Profiles

A **profile** is the slice an agent runs under: which library skills reach the model, and which client plugins load. Each user has as many as they want; exactly one is **active**.

The roster lives on the plugin manager (the VPS), not on the machine. The client materializes what the server says; it does not author profiles.

## Concepts

- **Profile** = `{ name, description?, plugins[], skills[] }`, owned by a user, edited at **Perfis** in the dashboard.
- **Active profile** = `User.activeProfileId` on the server. Switching is a column write: no token is minted or revoked, and the next request from any device resolves the new profile. It is per **user**, not per device.
- **Library skills** are filtered server-side. A skill outside the active profile does not exist for that token — `GET /skills/<name>` answers 404.
- **Local skills** on the machine (`~/.dsh/skills`, `~/.agents/skills`, the project roots) are **not** narrowed by a profile. The profile slices the VPS library.
- **No active profile ⇒ empty catalog**, not the full library. If "no profile" read everything, a client could skip choosing one and ignore the slice entirely.

## Using it

1. **Create a profile**: dashboard → **Perfis** → *Novo perfil* → name, tick the plugins, tick the skills.
2. **Make it active**: *Tornar ativo* on the card, or the profile picker in the app.
3. **Switch**: the picker in the app, or the dashboard. Plugins marked **reinício** live in the process composition, so turning one on or off asks to restart the app.

## What a profile cannot do

- **It only narrows.** The selection is filtered by `published` on read, so a profile never reaches a skill the published library did not already grant. That is what makes it safe for every user to edit their own.
- **Sessions already open keep the composition their history was produced under.** Switching applies to new sessions; the app says so rather than failing silently.
- **It is not a security boundary on the machine.** Which plugins load is a composition fact, and the client runs on the user's own computer. The enforced half is the server's: skill bodies are served only to a token whose active profile selected them.

## Related

- `/00-start-here` — process conventions (this file is a helper, not a pipeline stage).
- Profiles don't isolate data (same home); by design. For real isolation run separate `$DSH_HOME` instances.
