---
name: ui-palette
description: Let the requester choose the product's color palette before the first prototype screen — propose palettes from the brief and open the Paletas tab with the palette_pick tool (presets, generator, custom hex), complete every role, check contrast, and record the result as mds/epics/<epic>/03-palette.md, the one source of every color the prototype and the React app use.
whenToUse: At the start of /03-prototype, before any screen is built. Also when /04-tech-plan records the frontend stack, when /07-build briefs a UI ticket, and whenever the requester asks to change the product's colors.
---

# UI palette

The requester chooses the colors; the agent proposes, renders and checks them. Every color the product shows comes from `mds/epics/<epic>/03-palette.md`: in the prototype through `prototype/theme.js`, in the React app through the theme CSS variables. A color literal anywhere else, or a default Tailwind color (`bg-blue-600`) standing in for a palette role, is a defect.

## 1. Propose options

Read `01-brief.md` (tone, audience, sector, brand) and the project's `AGENTS.md` before proposing; the Products table of `skill ui-ux-pro-max` gives the usual color mood of the product type. Then prepare **3 or 4 palettes**:

- Brand colors already named by the requester (brief, AGENTS.md, an existing CSS file, a logo in the workspace) become the first option, built around them. Otherwise the palette that best fits the brief's tone is first and is the recommendation.
- Each palette has a short name and one sentence of consequence the requester can feel ("sober, reads as financial trust"; "warm, approachable for a family audience"), never color theory.
- Each palette defines every role below in **light and dark**, as 6-digit hex (`#0F766E`, never `#0F7`):

| Role | Use |
|---|---|
| `background` / `foreground` | page surface and body text |
| `card` / `card-foreground` | raised surfaces |
| `primary` / `primary-foreground` | main action, active state, brand |
| `secondary` / `secondary-foreground` | secondary actions |
| `muted` / `muted-foreground` | subdued surfaces, helper text |
| `accent` / `accent-foreground` | highlights, hover, selection |
| `destructive` / `destructive-foreground` | delete, errors |
| `success` / `success-foreground` | confirmations |
| `warning` / `warning-foreground` | caution |
| `border`, `input`, `ring` | lines, field borders, focus ring |
| `chart-1` … `chart-5` | data series |

Every `*-foreground` on its surface meets **WCAG AA**: 4.5:1 for text, 3:1 for `border`/`ring` against `background`. Measure it (section 4), never judge by eye.

## 2. Show them and ask — `palette_pick`

Call the `palette_pick` tool. It opens the **Paletas** tab by itself and waits until the requester confirms:

- `question`: the choice in the requester's language, for example "Escolha a paleta de cores do sistema — as sugestões no topo foram feitas a partir do briefing."
- `suggestions`: your 3 or 4 palettes from section 1, the recommended one first, each `{ name, colors, note }`: `colors` are the palette's defining colors (primary, secondary, accent, background, foreground, in that order), `note` its consequence sentence.

The tab also offers curated presets filterable by style and color family, a generator, and one hex field and color picker per role (Primária, Secundária, Destaque, Fundo, Texto), with a light/dark preview. Do not write a palettes page yourself.

The call returns `{ source, name, colors, roles }`: `source` is `suggestion`, `preset`, `generated` or `custom`, and `roles` maps `primary`, `secondary`, `accent`, `background` and `foreground` to hex as the requester saw them in the preview. `{ cancelled: true }` means they closed it: ask in chat what they want before calling again.

## 3. Treat the answer as custom colors

Whatever the source, the answer defines five roles at most; section 1 needs every role. Continue with section 4 using `roles` as the requester's colors. A suggestion of yours that you already filled in section 1 keeps your full role set.

## 4. Complete and check the palette

1. **Keep what they chose.** Each role in `roles` keeps its exact hex; record `requester_words` as the palette name and source.
2. **Fill the roles.** Derive every missing role from them: neutrals tinted toward `primary`, `destructive`/`success`/`warning` in conventional hues adjusted to sit with `primary`, and the dark mode from the light one. State which roles you derived.
3. **Measure contrast** for every pair in section 1 with this function, run through `bash` (`node -e`) or `prototype_automation` `eval` on any page:

   ```js
   const L = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
   const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
   ratio('#FFFFFF', '#0F766E');
   ```

   For each failing pair, compute the smallest lightness change of the **derived** color (or of the requester's color when both sides are theirs) that passes.
4. **Confirm a fix.** When a pair fails, call `palette_pick` again with two `suggestions` — "Como enviada" and "Com ajuste de contraste (recomendada)" — and a `question` naming the pair, its ratio and the adjusted hex. The requester's decision stands: a palette kept below AA is recorded with the failing pairs listed in `03-palette.md`.

## 5. Record `mds/epics/<epic>/03-palette.md`

```markdown
---
epic: <slug>
artifact: palette
status: validated
source: preset | custom
chosen: <palette name>
requester_words: "<their answer, verbatim>"
---
# Palette — <initiative>
## Tokens
| Role | Light | Dark | Use |
|---|---|---|---|
| primary | #0F766E | #2DD4BF | main action, active state |
(…every role from section 1…)
## Derived roles
<which roles were derived from which requester colors; "none" for a preset>
## Contrast
<every pair with its light and dark ratio; any accepted failure and the requester's words>
```

`03-prototype-validation.md` records the palette as its first approved line. After the prototype freeze, a palette change follows the freeze rule of `/03-prototype`: a recorded amendment (was, becomes, why, the requester's words), then `03-palette.md`, `theme.js` and the app CSS updated together.

## 6. Apply in the prototype

`prototype/theme.js` is the only prototype file with color literals, and it copies `03-palette.md` exactly. Every page loads it right after the Tailwind CDN:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="theme.js"></script>
```

```js
// Colors from mds/epics/<epic>/03-palette.md — edit there first.
const PALETTE = {
  light: { background: '#FFFFFF', foreground: '#0F172A', primary: '#0F766E', 'primary-foreground': '#FFFFFF' /* …every role… */ },
  dark: { background: '#0B1120', foreground: '#E2E8F0', primary: '#2DD4BF', 'primary-foreground': '#042F2E' /* …every role… */ },
};
const channels = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ');
const vars = m => Object.entries(m).map(([k, v]) => `--${k}: ${channels(v)};`).join('');
document.head.insertAdjacentHTML('beforeend', `<style>:root{${vars(PALETTE.light)}}.dark{${vars(PALETTE.dark)}}</style>`);
if (window.tailwind) {
  tailwind.config = {
    darkMode: 'class',
    theme: { extend: { colors: Object.fromEntries(Object.keys(PALETTE.light).map(k => [k, `rgb(var(--${k}) / <alpha-value>)`])) } },
  };
}
```

Screens use only the role classes (`bg-primary`, `text-primary-foreground`, `border-border`, `bg-muted/50`) — opacity modifiers work because the variables hold RGB channels. Dark mode is the `dark` class on `<html>`. Check with `grep -nE '#[0-9a-fA-F]{3,8}\b|(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]' prototype/*.html`: no hit.

## 7. Apply in the React app

A builder subagent does this, after the principal creates the frontend with `shadcn init` (`/shadcn-ui` step 1). The theme CSS is product code: the principal edits product code only to fast-fix what the live browser proof exposed, so applying the palette is the builder's ticket work.

- Open the CSS file `init` generated inside the frontend folder (`src/index.css` for Vite, `app/globals.css` or `src/app/globals.css` for Next, `resources/css/app.css` for Laravel) and replace the values inside `:root` and `.dark` with the palette's light and dark hex. **Keep the file's value format**: Tailwind v4 projects accept hex as written; a Tailwind v3 project whose variables hold `H S% L%` channels (`hsl(var(--primary))`) gets each hex converted to that form.
- `success`, `warning` and their foregrounds are not in shadcn's defaults: add them to `:root` and `.dark`, and on Tailwind v4 map them in the `@theme inline` block (`--color-success: var(--success);`), or on v3 in `tailwind.config` `colors`.
- Components use the role utilities only (`bg-primary`, `text-muted-foreground`, `bg-success`). A hex, `rgb()`, `oklch()` literal or default Tailwind color in a component is RED.

## Done

`03-palette.md` is `validated` with every role in light and dark and its contrast table; `theme.js` and the app's theme CSS match it value for value; the grep above has no hit; and a real-browser screenshot shows the product in the chosen colors. A color literal outside the theme files is RED at evaluation.
