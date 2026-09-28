# dsh-browser

A sidebar **Browser tab** for dsh, plus the agent tools to drive it: open it,
navigate to a URL, screenshot the app window showing it, and open external URLs
in the system browser. It replaces the dsh-better-sidebar builtin browser, which
is hidden from the `+` menu.

The tool has two scopes. In `workspace` (the default) the visited page is a
sandboxed, cross-origin iframe, so a page cannot reach the GUI's origin, storage
or `/sidebar/api`, and the agent can navigate and screenshot but cannot read the
DOM or console or click. In `full` the desktop's driver renders the real page
inside the tab and the agent scripts it like a user. For the workspace's own
prototype — served same-origin by `dsh-prototype` — use the
`prototype_automation` tool instead.

## Agent tool `browser`

| `op` | Args | Effect |
| --- | --- | --- |
| `open` | `url?` | Open the Browser tab (at `url` when given; an http(s) `url` without `scope` loads the real page in scope `full`) |
| `navigate` | `url` | Open the Browser tab at `url` (an http(s) `url` without `scope` loads the real page in scope `full`) |
| `focus` | — | Bring an open Browser tab to the front |
| `screenshot` | `full?`, `settle?`, `quietMs?` | Capture the tab; saved under `<workspace>/.browser-shots/` and returned as a path. While a real page is shown it captures the page itself, and `full: true` goes beyond the viewport |
| `open_external` | `url` | Open `url` in the machine's default browser (OAuth / dashboard links) |
| `click`, `fill`, `read`, `eval`, `console`, `wait_for`, `wait`, `reconnect`, `reload`, `scroll`, `wait_stable`, `upload` | the op's arguments; `scope` defaults to `"full"` | Script the real page. `fill` never echoes the value |

## Full-scope access

Full scope is granted by default, and a page-automation op without a `scope` runs in it: the agent can drive any URL, including pages
where the desktop's browser session is signed in. A top-level
`browserFullAccess: false` in the harness `settings.yaml` (`$DSH_HOME`, on the
desktop `<userData>/harness`) revokes it, and every full-scope call then fails
with the remedy. The file is read on every call, so the change applies without a
restart. A missing or unreadable `settings.yaml` keeps the default grant. There
is no per-session approval.

The Browser tab must be visible and large enough to host the page; otherwise a
full-scope call fails with "aba Browser não está visível".

In the desktop the real page is a view laid over the tab. Switching to another
sidebar tab hides it, and returning to the Browser tab loads the same URL again.
The address bar and the reload button drive the same real page.

## How it works

- The host half relays one command at a time over `/browser/api/{pending,result}`.
- The client half polls `pending`, opens or focuses the tab through the
  better-sidebar service (`openTab({ type: 'browser', url })`), and answers
  `result`.
- Screenshots use the desktop window-capture bridge
  (`window.dshDesktopScreenCapture`), so they need no gesture and no picker.
