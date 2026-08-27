# dsh-kanban

Better-sidebar kanban over the workspace's process tickets: reads `mds/epics/<epic>/06-tickets/*.md` and lays them out in five status columns — **Active → In progress → Code + test → Human test → Done**.

A ticket is a plain markdown file with frontmatter:

```markdown
---
ticket: 01-user-auth
epic: user-auth
status: active
title: Implement user authentication
---
# body…
```

Moving a card (← →) rewrites only the `status:` line inside the existing frontmatter — the file stays the single source of truth, so agents reading tickets via file tools always see the live state. The human is the only one who should ever move a ticket to **Done**; agents advance through the first four columns as they work (convention enforced by the `/07-build` skill, not by this plugin).

API: `POST /kanban/api/board` (list) and `POST /kanban/api/move` `{path, status}` — same-origin, path-guarded under `mds/epics/`.

Empty states point at the flow: no `mds/` → create from the MDS tab; no tickets → run `/06-tickets`.

MIT.
