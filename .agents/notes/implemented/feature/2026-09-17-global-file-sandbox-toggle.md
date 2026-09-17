# Agent Note: Global File sandbox kill switch

Status: implemented

English | [中文](2026-09-17-global-file-sandbox-toggle.zh.md)

## Problem

Permission presets pin a sandbox mode only when a session is created, and `/permission` rewrites only the current session. There is no process-wide control that turns the file sandbox off for every session at once — including ones already open — so a user who needs Full access on a live session still has to switch each one, and a user who wants the default sandbox back has to reverse each of those switches.

The General Permission row cannot carry this: its copy states that it applies only to sessions started later, and rewriting every open session's `sandbox/mode` log would destroy the mode those sessions resume when the global switch is turned back on.

## Decision

`dsh-sandbox-policy` owns a process-wide `enabled` flag, default `true`, on both plugin Config and the `sandbox` Settings namespace. `resolve()` reads it on every call. When `enabled` is `false`, every policy — including an approved explicit mode and an open session's last `sandbox/mode` event — resolves as `danger-full-access`. Session logs are not rewritten. Turning the flag back on restores each session's logged mode on the next capability call.

The General File sandbox row in `dsh-client-ui-permission-presets` is the product control: an On/Off switch that writes `sandbox.enabled` through the shared Settings describe mirror. The row sits after Permission (`order: -15`) and hides itself when the host does not serve the namespace. It does not change approval policy; Full access in the description names unrestricted file access, which is the sandbox half of that preset.

The next model request observes the change through the existing `sandbox:policy` runtime-context contribution, which already calls `resolve({ session })`.

## Alternatives considered

**Rewrite every open session's `sandbox/mode` event when the switch flips.** Rejected because it destroys the mode those sessions would resume, and it makes an Off→On round-trip a permanent Full access pin rather than a reversible overlay.

**Fold the kill switch into the Permission row's `defaultPreset`.** Rejected because that value applies only at session creation; the product copy on that row already promises running sessions keep the preset they began with.

**A new client package for the row.** Rejected: the control sits next to Permission, shares the Settings describe mirror, and does not justify a second plugin package.

**Also force `approval/policy: never` while the sandbox is off.** Rejected: the control is a file-sandbox kill switch. Approval stays on its own knob and on the Permission preset. The description's "Full access" names the sandbox mode, not the bundled preset.

## Consequences

A user can disable the file sandbox for the whole process, including live sessions, from General settings, and re-enable it without losing per-session modes. Headless compositions can set `enabled: false` in cordis.yml without the UI. The cost is a new Settings namespace and a resolve precedence rung that every enforcing consumer already goes through.

Composer permission chips still show the session's logged preset while the kill switch is off; enforcement and the runtime-context snapshot are the authority.

## Testing

- Unit: composed `enabled: false` forces Full access without a settings provider; a Settings overlay disables open sessions and restores their logged mode; the `sandbox:policy` contribution renders Full access without rewriting the log.
- Client: the General row loads, toggles, hides an unserved namespace, and contains write failures.
- Keyless web e2e: the settings dialog snapshot includes the row; flipping the switch writes `sandbox.enabled` and changes `resolve()` for an already-open session whose `sandbox/mode` event stays `workspace-write`.
