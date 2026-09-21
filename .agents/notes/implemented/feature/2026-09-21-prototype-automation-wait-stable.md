# Agent Note: prototype_automation gains wait_stable

Status: implemented

## Problem

The model has two tools that drive a page: `browser` (the sidebar Browser tab) and `prototype_automation` (the Prototype tab). Their operations overlap almost completely, but only `browser` had `wait_stable`, and its description recommends it before a screenshot. Building a prototype page, the model called `prototype_automation` with `op: "wait_stable"` to let the page settle before capturing it, and the call failed schema validation. The model recovered, but the mismatch invited the error on every screenshot.

## Decision

`wait_stable` is a `prototype_automation` operation at every layer it crosses: the tool's `INTERACTIVE_OPS` and its `quietMs` parameter in `dsh-prototype`, the plugin-manager queue's `KNOWN_OPS`, and the page shim, both the library copy (`plugins/prototype/shim.ts`, `SHIM_VERSION` 2) and the copy `dsh-prototype` bundles for offline use (`lib/shim.js`, `BUNDLED_SHIM_VERSION` 2). In the page it settles once a `MutationObserver` has seen no change for `quietMs` (default 500, max 5000) with `document.readyState` complete, or at the deadline (default 8000, max 8500, under the tab's 9 s cap on a shim answer), and it always resolves `{ stable, quietMs, elapsedMs }` instead of failing — the same result as `browser`'s `wait_stable`. The tool description, `/03-prototype`, and `/00-start-here` tell the model to use it after `navigate` or an action and before `screenshot`.

## Alternatives considered

**Tell the model in the skills that `prototype_automation` has no `wait_stable`.** Rejected: the `browser` tool description recommends the operation on every step, and an instruction in a skill loaded earlier competes with it; matching the vocabulary removes the cause.

**Reuse `browser`'s page script, `requestAnimationFrame` tick included.** Rejected: that tick refreshes the last-change time on every frame, and a frame fires continuously, so the page reads as busy until the deadline. The prototype version counts DOM mutations and load state only.

## Consequences

- The model can wait for a prototype screen to settle before capturing it, with the same call it uses in the Browser tab.
- The production plugin manager must be deployed for the operation to pass its queue; until then a `wait_stable` submitted there is refused as an unknown op.
- `browser`'s own `wait_stable` still carries the frame tick; it is not changed here.
