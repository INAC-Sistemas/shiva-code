# dsh-mds

Workspace-scoped markdown artifacts for dsh web: one folder — `mds/` at the workspace root — that holds the project's durable notes, specs and artifacts, with a better-sidebar tab to browse and edit them.

## Experience

1. No `mds/` folder yet → the tab offers **Create mds folder** (one click, host-side).
2. Folder exists → a tree of folders and files (folders first, `.md` highlighted), search, **+ File** (new files start with a heading template), **+ Folder**.
3. Click a file → editor with dirty indicator and **Ctrl+S** to save; **Open** hands the file to VS Code (or `$DSH_EDITOR`); per-row **✕** deletes with confirmation.

## API

`POST /mds/api/<method>` (same-origin only, every path relative and guarded inside `mds/`):

| Method | Payload | Effect |
| --- | --- | --- |
| `status` | — | `{ workspace, root, folder, exists }` |
| `create_folder_root` | — | Create `<workspace>/mds/` |
| `list` | — | Flat entry list `{ path, type, size, mtime, md }`, folders-first |
| `read` | `{path}` | File content (≤ 512 KiB) |
| `write` | `{path, content}` | Create or overwrite (parents auto-created) |
| `create_dir` | `{path}` | New folder |
| `delete` | `{path}` | Remove file or folder (recursive) |
| `rename` | `{path, name}` | Rename one segment in place |
| `open` | `{path}` | Open in `$DSH_EDITOR` (default `code`) |

Guards: `..` and absolute paths rejected, per-segment name validation, traversal impossible, the `mds` folder itself cannot be deleted through the API, `.git`/`node_modules` inside are skipped when listing.

The workspace is the active session's cwd (fallback: process cwd) — the same resolution the rest of dsh uses.

## Agent tools (later)

The endpoints are deliberately shaped as a future tool surface (`mds_list`/`mds_read`/`mds_write`/…): until then, agents reach the same files through the ordinary file tools, since `mds/` is a plain folder in the workspace.

MIT.
