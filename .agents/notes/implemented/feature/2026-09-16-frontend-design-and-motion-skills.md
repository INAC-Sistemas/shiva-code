# Agent Note: Frontend design, motion and React quality skills in the library

Status: implemented

English | [中文](2026-09-16-frontend-design-and-motion-skills.zh.md)

## Problem

The product skill flow fixed how controls, icons and colors are chosen (`shadcn-ui`, `ui-icons`, `ui-palette`) but nothing chose the look beyond them. Prototypes and apps shipped the template result: default fonts, a stock shadcn layout, three equal cards under a centered hero, and no motion. The requester wanted modern pages that animate. Community skills that cover this exist on the host (`frontend-design`, `ui-ux-pro-max`, `baseline-ui`, `tailwind-patterns`, `react-ui-patterns`, `react-best-practices`, `fixing-accessibility`, `fixing-motion-performance`), but they could not be copied as they were, for three reasons. They contradicted each other and the flow: `frontend-design` demands bold palettes and forbids "design by components", while `baseline-ui` forbids animation unless requested, gradients and custom easing. Several depended on files the library cannot serve: `LibrarySkill` stores only the `SKILL.md` body, so the Python search script and CSV catalog of `ui-ux-pro-max` and the `rules/` tree of `react-best-practices` would have been lost. And they assumed stacks the flow does not use (Apollo, React Native `FlatList`, `next/dynamic` everywhere, Heroicons, Base UI first).

## Decision

**The eight skills are adapted, not mirrored.** Each lives at `plugins/dsh-skill-manager/skills/<name>/SKILL.md` as one self-contained body in English with `whenToUse`, and is synced to `plugin-manager/prisma/skills/` for the seed. `ui-ux-pro-max` carries its catalog as condensed Markdown tables generated from the original CSV files (96 product types, 57 styles, 57 font pairings, 27 landing patterns). `react-best-practices` carries all 45 rules condensed, marks the Server Components rules as Next.js-only, and replaces `better-all`, SWR-only fetching and deep `lucide-react` imports with the flow's defaults. Each body ends with a one-line attribution to its source.

**Motion is required and has one owner.** `frontend-design` section 3 defines the motion contract: every screen has an entrance sequence, scroll reveals, control feedback, state-change transitions, animated loading and one signature moment, all driven by duration and easing tokens. `baseline-ui`, `fixing-motion-performance`, `fixing-accessibility`, `tailwind-patterns` and `react-ui-patterns` enforce that contract instead of contradicting it. They limit how motion runs (compositor properties on large surfaces, reduced motion keeps content, animations never block input, content stays visible when the CDN fails), not whether it exists. Gradients, glows and textures are allowed when built from palette roles.

**The design direction is an artifact.** `frontend-design` records `mds/epics/<epic>/03-design.md` right after `03-palette.md`: aesthetic, differentiation anchor, font pairing, composition and motion tokens. `03-prototype` gates screens on it and requires animated screens built with Motion's CDN build (`https://cdn.jsdelivr.net/npm/motion@13/dist/motion.js`, global `Motion`). `04-tech-plan` requires the file and adds a fonts and motion Decisions row (`motion/react` beside the `tw-animate-css` that `shadcn init` installs). `07-build` briefs UI builders with a bounded skill set and gives the evaluator RED checks for missing motion, motion that breaks reduced motion, missing data states and critical accessibility violations. `00-start-here` states the standing rule and `ui-palette` reads the product type's color mood from the catalog.

**Skill loading is bounded per role.** `ui-ux-pro-max` (about 50 KB) loads only during the design-direction step of `03-prototype`. Builders load `frontend-design` and `baseline-ui` with the three existing UI skills, adding `react-ui-patterns`, `tailwind-patterns` or `react-best-practices` only when the ticket needs them. The evaluator loads the two `fixing-*` skills in review mode. This keeps UI briefings inside the `07-build` context budget.

## Alternatives considered

**Copy the host skills unchanged.** The quickest path. Rejected because the model would receive opposite orders about animation and color, the catalog skill would reference a script and data that do not exist on the client, and the examples would steer builders toward libraries the flow forbids.

**Serve bundle resources from the library.** Adding file storage to `LibrarySkill` and a resource path to the remote skill loader would keep the original multi-file skills. Rejected for this change because it touches the Prisma schema, the API, the plugin shell and a client release, while condensing into the body costs one larger skill body.

**Keep motion optional and let `frontend-design` decide per product.** Rejected because the requester asked for animated pages, and an optional rule is exactly what `baseline-ui` had turned into "no animation".

## Consequences

Every prototype and app built through the flow gets a recorded visual direction and animated screens, and the evaluator can reject a static or template screen with a named rule. A change of fonts, direction or motion after the prototype freeze is an amendment under the `03-prototype` freeze rule, like a palette change.

The catalog tables are a snapshot of the source CSV files. Updating them means regenerating the tables and editing the body; there is no data file to replace.

The skills reach authenticated agents at the next deploy: the seed creates the eight rows and attaches them to each user's `Padrão` profile. Manually curated profiles receive them only when someone selects them.
