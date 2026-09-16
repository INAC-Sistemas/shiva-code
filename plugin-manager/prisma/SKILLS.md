# `skills/` is generated — do not edit here

The skill bundles under `skills/` are a mirror of
`plugins/dsh-skill-manager/skills/`, the copy the desktop ships and the skill
loader reads. That directory is the single source of truth; this one exists so
the VPS library seed can recreate the same skills on every deploy.

Every new product skill is added at the source, then synced, then picked up by
[`seed.ts`](seed.ts) so the body is served only when the skill is selected in
the signed-in user's active profile. See
[plugin-manager/AGENTS.md](../AGENTS.md#biblioteca-de-skills).

Edit the source, then sync:

```sh
node scripts/sync-skills.mjs
```

from the repository root. The sync overwrites and prunes, so direct edits here
are lost on the next run. `node scripts/sync-skills.mjs --check` fails when the
two trees have drifted.
