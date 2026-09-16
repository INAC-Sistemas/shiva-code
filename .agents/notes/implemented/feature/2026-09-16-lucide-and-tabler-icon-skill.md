# Agent Note: One icon rule for product UI — Lucide first, Tabler second

Status: implemented

English | [中文](2026-09-16-lucide-and-tabler-icon-skill.zh.md)

## Problem

The product skills told agents where standard controls come from (`shadcn-ui`) but never where icons come from. Nothing named a pack, so each ticket decided again: a hand-written `<svg>` path, an emoji in a button label, a fourth icon dependency, or a deep `dist/` import that breaks on the next release. The `03-prototype` skill made it worse by listing icons among the assets `generate_image` produces, contradicting its own instruction to load lucide from a CDN — a generated PNG in place of a glyph does not scale, recolor, or match the control it sits in.

Two facts made the gap cheap to close. DSH Desktop bundles Node.js and pnpm on `PATH` for every agent shell, so a builder can install a package on an end-user machine that has no system Node.js; and the plugin-manager seed now publishes a versioned `SKILL.md` to the library on every deploy ([seed recreates library skills](../architecture/2026-09-16-plugin-manager-seed-recreates-skills.md)), so a new rule reaches authenticated agents without a client release.

## Decision

**`ui-icons` is the skill that owns icons, and Lucide is the default.** `plugins/dsh-skill-manager/skills/ui-icons/SKILL.md` states the pack order — a pack already in the project's `package.json` wins, otherwise `lucide-react`, with `@tabler/icons-react` only when Lucide has no glyph for the meaning or the requester names it. Both packs are MIT, stroke-based and visually compatible with shadcn/ui, which is why the set is closed at two: a hand-written SVG, an emoji-as-icon, or a third pack is a defect when either covers the need.

**The rule is stated where a decision is actually made.** `04-tech-plan` records the pack as a Decisions row next to the shadcn template, base and preset; `07-build` loads `ui-icons` beside `shadcn-ui` in every UI ticket briefing and adds the matching evaluator check; `00-start-here` carries the one-line standing order; `03-prototype` no longer lists icons among generated media. Installation is a builder action (`pnpm add`), because `dsh-tool-guard` denies the principal writes outside `mds/` and `prototype/`.

**The skill states the mechanics that fail silently otherwise.** Named imports from the package root only, since a deep `dist/` path defeats tree-shaking and breaks on release; Tailwind size classes and `currentColor` instead of pixel and hex literals; `aria-hidden` for a decorative glyph and `aria-label` for an icon-only control; in the CDN-only prototype, `data-lucide` kebab-case names with `lucide.createIcons()` re-run after any injected markup, and the Tabler webfont for the same rule-3 exception.

## Alternatives considered

**Fold the icon rule into `shadcn-ui`.** One fewer skill, and shadcn already pulls `lucide-react` in as a component dependency. Rejected because the two rules have different scopes: icons appear in the CDN-only prototype where shadcn does not, and in projects that ruled shadcn out, while `04-tech-plan` may legitimately record a shadcn opt-out and still need a pack. A skill loaded for "standard controls" would not be loaded by a ticket that only adds an icon.

**Pick a single pack and forbid the second.** The simplest rule to evaluate. Rejected because Lucide's catalog has no brand glyphs and thin coverage of finance and device symbols, so a single-pack rule would be broken by the first "sign in with GitHub" button — and broken by hand-drawing an SVG, which is the outcome this skill exists to prevent. Tabler as a named, reported exception keeps the escape inside the rule.

**Let the tech plan choose any pack it likes.** Maximum freedom per project. Rejected because an open choice is what produced the inconsistency: with no default, each epic re-litigated the decision, and mixed packs inside one product are visible to users as mismatched stroke weights and corner radii.

**Pin exact versions in the skill's install commands.** Reproducible installs. Rejected because a skill body is not a lockfile: the pinned version ages into a stale instruction the moment either pack releases, and the project's own lockfile is where reproducibility belongs. `pnpm add` without a range is the instruction that stays true.

**Vendor an icon set into the project instead of depending on a package.** No install step, works without a registry. Rejected because it hands the agent a folder of SVGs to hand-maintain — the same defect in a different form — and both packages already tree-shake to the glyphs actually imported.

## Consequences

An icon now has one right answer, and a wrong one is mechanically arguable at evaluation: the evaluator's UI check names hand-written SVGs and emoji-as-icons alongside hand-written controls. Projects that already carry a different pack are unaffected, because an installed pack outranks both defaults.

The rule reaches authenticated agents through the library, not through a client release: the bundle is mirrored into `plugin-manager/prisma/skills/ui-icons/` by `node scripts/sync-skills.mjs`, and the seed publishes it and attaches it to the `Padrão` profile at the next deploy. A profile that is a deliberate manual cut does not receive it until someone selects it there.

Two packs may coexist in one project under the Tabler exception, which is the accepted cost of covering brand glyphs without hand-drawn SVGs; the ticket report names the screen that needed it, so a reviewer can see whether the exception was real.
