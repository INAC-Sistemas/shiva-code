# dsh-skill-manager

Better-sidebar tab to manage every DeepSeek Harness skill from the web UI: list, inspect, create, edit, rename, and delete — with **instant hot-reload** (no dsh restart; the skill file watcher picks writes up immediately).

![tab] Lists skills from all four sources the harness reads: project `.agents/skills` + `.dsh/skills`, user `~/.agents/skills` + `~/.dsh/skills`.

## Use

1. Open better-sidebar → **Skills**.
2. Search/filter, click a skill to open the editor (name, description, whenToUse, flags, markdown body).
3. **+ New skill** → fill the form → **Create** — the skill is live on the next model step.
4. **Open in editor** hands the file to VS Code (or `$DSH_EDITOR`).

Becoming live means: the model-facing catalog republishes at the next agent step and `skill.get()` re-reads the file every time. The client `/` slash-menu cache refreshes on the next session/preset event.

## API

`POST /skill-manager/api/<method>` (same-origin only):

| Method | Payload | Effect |
| --- | --- | --- |
| `list` | — | All skills with source, path, validity, invocation flags |
| `read` | `{path}` | Full SKILL.md content |
| `create` | `{name, scope, description, whenToUse, modelInvocable, userInvocable, body}` | New `<scope>/<name>/SKILL.md` |
| `update` | `{path, content, newName?}` | Write (and optional kebab-case rename/move) |
| `delete` | `{path}` | Remove bundle folder or flat file |
| `open` | `{path}` | Open in `$DSH_EDITOR` (default `code`) |

Every write path is guarded to the four managed roots; names are validated kebab-case `^[a-z0-9]+(?:-[a-z0-9]+)*$` (the same rule the skill registry enforces).

## Files

```text
<root>/
  <name>/SKILL.md    directory bundle (what Create produces)
  <name>.md          flat file (listed and editable too)
```

Frontmatter keys: `name`*, `description`*, `whenToUse`, `disable-model-invocation`, `user-invocable`. The editor preserves unknown frontmatter lines; the **Advanced** checkbox edits the raw frontmatter verbatim.

## Agent workflow

Ask the agent to manage skills through the plugin endpoints — e.g. "create a skill X in user scope" runs `create`, "update skill Y" runs `read` + `update`. No file-system access needed from the chat side.

MIT. Part of the in-tree plugin set under `plugins/`.
