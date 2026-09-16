# `skills/` is generated — do not edit here

The skill bundles under `skills/` are a mirror of
`plugins/dsh-skill-manager/skills/`, the copy the desktop ships and the skill
loader reads. That directory is the single source of truth; this one exists so
the VPS library carries the same skills.

Edit the source, then sync:

```sh
node scripts/sync-skills.mjs
```

from the repository root. The sync overwrites and prunes, so direct edits here
are lost on the next run.
