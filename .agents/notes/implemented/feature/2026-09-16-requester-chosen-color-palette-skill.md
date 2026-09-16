# Agent Note: The requester chooses the color palette at the start of the prototype

Status: implemented

English | [中文](2026-09-16-requester-chosen-color-palette-skill.zh.md)

## Problem

No stage of the product skill flow decided colors. `03-prototype` styled screens with the Tailwind Play CDN defaults, `prototype.md` recorded "theme" only as free text under Global decisions, and `shadcn-ui` forbade hard-coded colors while leaving the variable values at the `init` preset. Every generated system therefore shipped in preset colors the requester never saw as a choice, and a brand color mentioned in conversation reached neither the prototype nor the build, because the tool result that carried it scrolls out of the model's context.

## Decision

**`ui-palette` owns the palette, and the choice happens in Part 0 of `03-prototype`, before any screen.** `plugins/dsh-skill-manager/skills/ui-palette/SKILL.md` has the agent propose 3–4 palettes derived from `01-brief.md` (requester brand colors first when they exist), render them with light and dark mini UI previews in `prototype/palettes.html`, open that page with `prototype_automation`, and ask with `ask_user_question`: one option per palette, custom colors in the free-text answer. Custom colors are parsed, missing roles are derived, WCAG AA contrast is measured with `prototype_automation` `eval`, and the custom palette is rendered and confirmed before it is recorded.

**`mds/epics/<epic>/03-palette.md` is the only source of colors.** It carries every role (the shadcn variable names plus `success` and `warning`) in light and dark, the requester's words, derived roles and the contrast table. The prototype reads it through one `prototype/theme.js` that sets RGB-channel CSS variables and the Tailwind Play CDN color config; the React app reads it through the theme CSS file `shadcn init` generated. Because the artifact is a file under `mds/`, every later stage and every subagent briefing reads it by path, so the choice stays in the model's context for the whole epic.

**The rule is stated where each decision is made.** `00-start-here` carries the standing order, `03-prototype` gates Part 1 on the validated palette and references it in `prototype.md`, `04-tech-plan` requires the file and records a Theme colors Decisions row, `07-build` loads `ui-palette` in UI briefings and gives the evaluator a RED check for color literals, and `shadcn-ui` points its variable values at the palette.

## Alternatives considered

**A native palette question in the desktop app.** Swatches and a color picker inside the question panel would look better than a prototype page. Rejected for now because it needs a new `AskUserQuestionIntent` in `packages/interaction/user-questions`, the strict wire schema in `packages/host/apiproxy/src/api/events.schema.ts`, the `ask_user_question` tool schema, a panel in `packages/client/ui-user-questions` `QuestionComposer`, the LAN mobile question page, snapshots for both SDKs, and a client release. The skill reaches users through the library seed today, and a later intent can replace only section 3 of the skill.

**Choose the palette in `01-epic-brief`.** Earlier and next to brand identity. Rejected because the requester would pick colors without seeing any screen, and `03-prototype` is where the look is validated and frozen.

**Let `04-tech-plan` pick colors alone.** Consistent with "decide libraries alone". Rejected because colors change what the requester receives and are expensive to reverse after tickets are built, which is the flow's own test for a requester decision.

## Consequences

Every prototype and app built through the flow uses the requester's palette, and a stray literal is mechanically findable: the skill's grep over `prototype/*.html` and the evaluator's check in `07-build`. `palettes.html` is the one prototype file allowed color literals and never enters `prototype.md`.

A palette change after the prototype freeze is an amendment under the `03-prototype` freeze rule, and `03-palette.md`, `theme.js` and the app theme CSS change together.

The skill reaches authenticated agents through the library, not a client release: `node scripts/sync-skills.mjs` mirrors it into `plugin-manager/prisma/skills/ui-palette/`, and the seed publishes it and attaches it to the `Padrão` profile at the next deploy. A manually curated profile does not receive it until someone selects it.
