# dsh-openviking

Native [OpenViking](https://github.com/volcengine/OpenViking) for dsh: the agent's long-term context database (memories, resources and skills as a semantic `viking://` filesystem) running as if it belonged to the dsh server itself.

## What it does

1. **Auto-install** — first dsh boot with this plugin downloads the pinned `openviking` wheel (≈26 MB, plus dependencies) into a dedicated venv under `~/.dsh/openviking/venv`. One time only; the tab shows the live log.
2. **Auto-start** — every dsh boot brings the OpenViking HTTP server up on `127.0.0.1:1933` as a **managed child process** (dies with dsh). A healthy server already on the port is **adopted**, never killed.
3. **Config in our UI, not in files** — the Memory tab's one-screen wizard (embedding provider: Volcengine / OpenAI / Ollama-local / custom OpenAI-compatible, plus optional VLM) writes `~/.openviking/ov.conf` for you and restarts the server. Connection test is implicit: the server only starts with a valid embedding section.
4. **Model tools** — mounts the harness MCP client after the server is healthy, so the model gains `mcp__openviking__find / _search / _read / _remember / _add_resource / _forget / _health` without a dsh restart.
5. **Studio tab** — the Memory tab frames OpenViking's own Web Studio (resources browser, retrieval with visible trajectory, sessions, settings) served at `/studio` by the wheel itself.

## API

`POST /openviking/api/<method>` (same-origin): `status`, `install`, `configure` `{embedding, vlm?}`, `restart`, `reset` (kills our child, removes the venv).

## Config

| Field | Default | Meaning |
| --- | --- | --- |
| `pythonCandidates` | `[]` | Interpreter commands probed on install, best first. Empty means this platform's order: `py -3.12 \| -3.11 \| -3.10 \| python` on Windows, `python3.12 \| python3.11 \| python3.10 \| python3` on macOS and Linux. An entry may carry arguments (`py -3.11`) or be an absolute path. |

Set it only when the interpreter lives somewhere the probe order misses; the 3.10–3.12 range itself is not configurable, because the pinned wheel's native dependencies decide it.

## Platform

Interpreter names and venv layout are resolved from `process.platform` at runtime, so one source serves all three platforms: the venv's executables are `Scripts\<name>.exe` on Windows and `bin/<name>` on macOS and Linux — CPython's `venv` layout, not ours.

Version selection reads the version out of `<interpreter> --version` and enforces 3.10–3.12; an interpreter that runs but reports an out-of-range version is skipped with the reason in the tab log, never used. This matters for the generic fallback names, which resolve to whatever the machine defaults to — routinely 3.9 on macOS and 3.13+ on a current Linux.

## Notes

- The server refuses to start without an embedding section (it would fall back to a local embedder that is not shipped); the wizard is therefore the gate — no half-broken state is ever shown.
- Python 3.10–3.12 is required for the venv (3.13+ may miss native deps); the installer picks the first candidate in range and reports every step in the tab log. It must already be on the machine — bundling a runtime is a separate, unsolved packaging question.
- Privacy: data stays on the machine; embedding/VLM text is sent to whichever provider is configured (Ollama keeps everything local).
- OpenViking is AGPL-3.0 — running it as a separate process keeps the harness clean; revisit before commercial bundling.
- The upstream clone used as reference lives outside the repo (`../dsh-references/openviking`) and is not committed.

MIT (this plugin).
