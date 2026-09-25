# dsh-kanban

Kanban board over the workspace's tarefas (one per functionality of the system)
for dsh web: a better-sidebar tab that reads the `status` frontmatter of
`mds/epics/<epic>/06-tickets/NN-<slug>.md` and moves cards through
`active → in_progress → code_test → human_test → done`. The board shows these
statuses as **A fazer → Iniciada → Testando → Finalizada → Aceita**; the file
names, the folder and the `status:` values stay in the form the skills and
`dsh-tool-guard` read.

## Experience

The copy is Portuguese and calls every card a *tarefa*.

1. No `mds/` folder yet → the tab explains where tarefas will appear.
2. Folder exists → one column per status plus an **Outras** column for tarefas
   with a missing or unrecognized status (nothing is dropped).
3. A card shows the tarefa title, its epic and its slug. The status dropdown
   sets any status; the **→** button advances one step. Moving to **Aceita**
   (`done`) asks for confirmation, because acceptance is the human's move, not
   the agent's.
4. Clicking a card title opens a read-only preview of the tarefa.
5. The board polls every 4 s, so edits agents make directly to the tarefa files
   appear without a reload.

## API

`POST /kanban/api/<method>` (same-origin only; every ticket path is validated
against `epics/<epic>/06-tickets/<file>.md` inside `mds/`):

| Method | Payload | Effect |
| --- | --- | --- |
| `status` | — | `{ workspace, root, folder, exists, statuses }` |
| `list` | — | `{ exists, cards, statuses }`, cards ordered by epic then numeric prefix |
| `read` | `{file}` | Ticket content (≤ 512 KiB) |
| `move` | `{file, status}` | Set the frontmatter `status`, rewriting only that line |

Each card is `{ file, name, epic, ticket, title, status, order, mtime }`.
`move` accepts `active`, `in_progress`, `code_test`, `human_test`, `done`;
a ticket whose status is missing or unknown is still listed (in **Other**) and
can be moved into the canonical set.

The workspace is the active session's cwd (fallback: process cwd) — the same
resolution the rest of dsh uses.
