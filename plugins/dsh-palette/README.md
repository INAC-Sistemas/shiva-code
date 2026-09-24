# dsh-palette

The color palette picker of the prototype stage. It adds a **Paletas** sidebar tab and the `palette_pick` agent tool.

## Flow

1. At the start of `/03-prototype`, the model calls `palette_pick` with an optional `question` and up to 8 `suggestions` (`{ name, colors: ['#RRGGBB', …], note }`) drawn from the brief.
2. The tool opens a request; the tab's client polls `pending` every second and **opens the Paletas tab by itself** on a new request, expanding a collapsed sidebar (`openTab` with `expand: true`).
3. The person browses and picks:
   - **preset palettes** filterable by style (Populares, Pastel, Escuras, Vibrantes, Neutras, Monocromáticas) and by color family (Vermelho … Cinza);
   - the model's **suggestions**, shown first;
   - **Gerar paleta**, a random harmonious palette (analogous, complementary, triad or monochromatic);
   - **Personalizada**: one hex field and color picker per role (Primária, Secundária, Destaque, Fundo, Texto).
   Clicking a color stripe copies its hex. The selection is previewed on a mini interface in light and dark with its text/background contrast.
4. **Usar esta paleta** answers the tool call with `{ source, name, colors, roles, next }`. The answer is a logged tool result, so the palette enters the model's context; `next` tells the model to continue with skill `ui-palette` §4: derive every role, measure contrast, record `mds/epics/<epic>/03-palette.md`, and write `prototype/theme.js`, which sets the Tailwind theme colors. **Cancelar pedido** answers `{ cancelled: true }`.

The call has no deadline of its own: it waits until the person answers or the turn is cancelled. One request is open at a time.

## API

`POST /palette/api/<method>`, same-origin only:

| Method | Payload | Answer |
| --- | --- | --- |
| `presets` | — | `{ palettes }` — the curated presets (`lib/palettes.js`) |
| `pending` | — | `{ request }` — the open request (`id`, `question`, `suggestions`) or `null` |
| `choose` | `{ id, selection: { source, name, colors, roles } }` | resolves the request; every color must be `#RGB` or `#RRGGBB` |
| `cancel` | `{ id }` | resolves the request with `{ cancelled: true }` |

MIT.
