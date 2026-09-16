---
name: 03-prototype
description: 'Build the initiative as a live HTML prototype (CDN-first: Tailwind, lucide, three.js, shadcn-style patterns; localStorage as the database; zero backend), validate every screen and flow with the requester in the Prototype tab using the browser-use API (navigate, click, fill, screenshot, console), and only after full GREEN produce prototype.md with every BDD scenario plus db-schema.json — each audited by a subagent. UX is frozen afterwards.'
whenToUse: After /02-core-flows is validated and before /04-tech-plan.
---

# Prototype

Turn the validated Core Flows into screens the requester has actually seen, clicked and approved — then freeze the UX as machine-checkable artifacts. Read `/00-start-here` first. Requires `mds/epics/<epic>/01-brief.md` and `02-flows.md` with `status: validated`.

## Part 1 — Build (CDN-first, mocks only)

Build in **`<workspace>/prototype/`** (create it if missing) with the `write` tool. Non-negotiables:

- **Always CDNs, never hand-rolled infrastructure**: Tailwind Play CDN for styling; lucide for icons; shadcn/ui-style component patterns implemented on top of Tailwind; three.js for 3D/parallax; recharts/Chart.js for charts. Whatever the screen needs, prefer a CDN library. CDNs are client-side assets, allowed and expected — never penalized by audits.
- **Zero backend.** No Node/Python/Go process is created or required. All data is **mocked**: hardcoded lists, in-memory state, and **localStorage** as the database (keys prefixed `proto_<epic>_`).
- All state faked: auth, payment, hash, ZIP, rollback — simulated. The only goal is UX/UI validation of the core flows. Nothing here is a production requirement.
- **Navigation rule**: no URL/hash routing (`href="#/x"` blanks the iframe). Pure-JS router: `data-go="screen"` attributes + one delegated click listener toggling view sections. Never navigate the frame itself from page code.
- Inline your own CSS/JS per file; external files in the same folder ARE served (our Prototype tab serves the folder, relative links and localStorage work for real).
- Guard every CDN dependency (`window.THREE` check / `onerror`) with a graceful inline fallback.
- Default entry: `prototype/index.html`. Screens from `02-flows.md`, each flow's happy + unhappy states reachable; unhappy paths get labelled demo controls ("simular erro"). Landing view = the first real screen of the journey, never a meta-page.
- Match the requester's language in every visible string. One screen per round-trip: build → hand over → collect corrections → approve. Never blanket-approve several screens.

## Part 2 — Validate with browser use (the `prototype_automation` tool)

Drive it with the `prototype_automation` tool — no curl, no manual HTTP. **You never need the human to open anything**: the tool opens the Prototype tab itself when it is closed, and `screenshot` captures the app window (always available — there is no toggle). The tab serves `prototype/` live and injects a shim; it is what executes each command.

| `op` | Extra args | Effect |
|---|---|---|
| `navigate` | `path:'login.html'` | Open a page inside `prototype/` |
| `click` | `selector:'#btn'` **or** `text:'Entrar'` | Click; `text` matches visible buttons/links |
| `fill` | `selector:'#email', value:'a@b.c'` | Native events, framework-safe |
| `read` | `selector:'.total'` or `attr:'href'` | Assertion data |
| `eval` | `code:'localStorage.getItem("proto_x_users")'` | Inspect mock state |
| `wait_for` | `selector:'.modal', timeoutMs:5000` | Wait for an element |
| `screenshot` | — | Full screen (chat + prototype); saved to `prototype/.shots/shot-<ts>.png` |
| `console` | — | Captured error/warn + runtime errors |
| `results` | — | Last 50 command results |

One command at a time — the tool submits and waits. Use it to **self-test every screen before handing it over** (click the flow, fill the form, confirm no console errors, screenshot for evidence) and to reproduce exactly what the requester reports broken; then `read_image` the screenshot to see it. Any raw shim op (e.g. `console_dump`) goes through `op:'submit'` with `cmd`. For prototype media — hero, avatars, icons — use `generate_image`/`generate_video`/`generate_audio` (they save into `assets/`) instead of placeholder URLs. For an **external** URL (a reference site, a CDN doc) use the `browser` tool (`open`/`navigate`/`screenshot`): it navigates and screenshots but cannot script the page; the prototype's own full control is `prototype_automation`.

## Part 3 — The GREEN gate

A screen is validated only when the requester explicitly approves it after navigating it themselves. Keep a validation ledger inside `mds/epics/<epic>/03-prototype-validation.md` (screen → approved? → findings → decisions changed). Unhappy paths are validated too — a state the requester cannot trigger was not validated.

When **everything** is GREEN:

1. **Update the upstream artifacts**: `edit` `01-brief.md` and `02-flows.md` for anything validation changed (renames, cut features, new states, tone). Never let the prototype contradict the brief.
2. **Audit that edit**: `subagent` with paths to both files + the validation ledger + instruction: "verify every validation-driven change is reflected and nothing else was altered; return GREEN or findings." Iterate to GREEN.
3. **Write `mds/epics/<epic>/prototype.md`** — the frozen UX contract: for **every validated screen**, every scenario as BDD:

```markdown
---
epic: <slug>
artifact: prototype
ux_status: frozen
---
# Prototype contract — <initiative>
source: prototype/ (entry index.html) · validated <date>
## Screen: <name> (file)
### BDD <scenario>
Given <state, incl. localStorage keys/values>
When <action>
Then <visible outcome>
### Unhappy: <trigger>
Given … When … Then <recovery/feedback>
(…ALL screens, ALL states — happy, empty, unhappy…)
## Global decisions (tone, naming, theme, CDNs)
## localStorage keys used by the prototype
```

4. **Write `mds/epics/<epic>/db-schema.json`** — the schema of the mock data the prototype actually used (entities, fields, types, relations, localStorage keys), so the next phase designs real persistence from evidence instead of guessing.
5. **Audit prototype.md with a second subagent**: give it `prototype.md`, the prototype file paths, and the validation ledger — "verify every validated screen/state has BDD here, scenarios match what was approved, nothing invented. GREEN or findings."
6. Both audits GREEN → set `03-prototype-validation.md` `status: validated` and announce the freeze: **from here, no screen, CTA, state, role or name changes without returning to this skill.**

## Failure handling

- White/blank screen = URL navigation or external non-CDN resource leaked in; inline everything, route via JS only.
- A failing automation call is reported verbatim, then fixed — never worked around.
- Requester reports a defect you cannot reproduce: drive it with the browser-use API until you see it; if you cannot, say exactly that.
- Never claim the requester saw a screen unless they confirmed it (or your screenshot shows it and they answered).

## Traceability and frozen text

- **Traceability must be real.** Every `UX-…` id a later stage cites must exist in this frozen `prototype.md`. In one epic 63 `UX-*` ids were cited by the tickets while `prototype.md` contained none (only `data-screen` names) — the link was prose, not a bond. When you freeze, give every screen/state/action a stable `UX-…` id in the contract, so the ticket stage can resolve them mechanically.
- **Frozen text is amended, never edited.** Once `prototype.md` is frozen, never edit it in place. Every change enters as a recorded **amendment**: what it was, what it becomes, why, and the owner's decision (their words). In one epic the agent edited the frozen `prototype.md` to match the code — the owner's decision was right, the mechanism was wrong (adjusting the spec to the code), and QA flagged it as a governance defect.
- If prototype and contract diverge, the contract rules — but register the divergence, do not silence it.
- Contract text existing in **three versions** (prototype, contract, ticket) means the ticket stage did not check the quotes: require byte-for-byte equality.
