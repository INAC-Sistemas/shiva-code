# Agent Note: OpenViking reconfigure action frees an orphaned data-directory lock

Status: implemented

## Problem

The Memory tab showed the OpenViking server down with `DataDirectoryLocked: Another OpenViking process (PID …) is already using the data directory`. An `openviking-server` left by an earlier app run still held `~/.dsh/openviking-desktop/data/.openviking.pid` without answering on the desktop port, so `dsh-openviking` could not adopt it, and every server it spawned exited at startup. The tab offered only "Tentar novamente", which spawned another server into the same lock, and the configuration form was reachable only before the first configuration.

## Decision

The desktop's `dsh-openviking` patch adds a **Reconfigurar** button to the tab's status bar and to its server-down view. It calls a new `reconfigure` API method that stops the plugin's own server, then runs `releaseStaleLock` on the data-directory lock: a live PID other than the plugin's own is signalled only when `isOpenVikingProcess` verifies it the way OpenViking does (a command line naming openviking, read from `/proc`), with SIGTERM and then SIGKILL after 5 s; a dead PID is left alone because OpenViking ignores it. The method returns the saved settings through `settingsForForm`, which replaces each API key with `hasKey`, and the tab reopens the configuration form prefilled with them. Saving goes through `configure`, which now keeps a stored key when the provider is unchanged and the key field was left blank, and restarts the server; "Cancelar" returns to the status view.

Two defects surfaced on the way and are fixed in the same patch. The Memory tab framed the Studio at a fixed `http://127.0.0.1:1933/studio`, the web checkout's port, while the desktop server listens on `DSH_OPENVIKING_PORT` (1934): with the web server down the tab was blank, and with it up the tab showed the wrong installation's data. The tab now frames `${status.baseUrl}/studio`. And the form sent a VLM block without a model whenever its API base was filled, which the server refuses at startup; the client sends, and `writeOvConf` writes, a VLM block only when a model is chosen.

## Alternatives considered

**Delete the lock file.** Rejected: the orphan would keep writing to the same data directory while a new server started on it, which is the storage contention the lock exists to prevent.

**Stop the orphan automatically at startup.** Rejected for now: the lock holder might be a server the person started on purpose, and a button keeps that decision with them.

**Adopt the orphan.** Not possible: it does not answer on the desktop port, which is the only way the plugin can talk to a server.

## Consequences

- One click recovers from an orphaned server; no terminal is needed.
- Off Linux the process cannot be verified, so the orphan is reported, not stopped.
- Reconfiguring stops the server until the form is saved.
