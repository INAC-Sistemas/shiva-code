/**
 * Leaving the current conversation when the profile changes.
 *
 * A session keeps the agent composition it started with, so after a switch the
 * person must land in a new one rather than the conversation the old profile
 * was running. The client runtime remembers the open session in
 * `localStorage` (`dsh.sessions.current`) and reopens it on load; clearing that
 * selection makes the next load open a blank session in the most recent
 * workspace.
 *
 * The services are read through structural faces because the packaged harness
 * names the "start a session" service `uiWorkspace` while this repository's
 * client names it `workspaces`; only these members are identical in both.
 * @module dsh-profiles/client/sessions
 */

/** The member of `ctx.sessions` this module calls. */
interface SessionsFace {
  /** Deselect the current session and forget it for the next load. */
  clear(): void
}

/** The member of `ctx.uiWorkspace` / `ctx.workspaces` this module calls. */
interface WorkspaceFace {
  /** Open a blank session in the current or most recent workspace. */
  startSession(workspaceId?: string): unknown
}

/** What the gate does to the open conversation after a profile switch. */
export interface SessionSwitch {
  /** Forget the open session, so the page load after a restart opens a new one. */
  forgetCurrent(): void
  /** Open a new session now, for a switch that needs no restart. */
  startNew(): void
}

function hasMethod<K extends string>(value: unknown, key: K): value is Record<K, (...args: never[]) => unknown> {
  return typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>)[key] === 'function'
}

/**
 * Build the switch over whichever services the client runtime provides.
 * @param get - `ctx.get`, read per call because the services may mount after this plugin.
 * @returns the switch; a missing service turns its step into a no-op.
 */
export function sessionSwitch(get: (name: string) => unknown): SessionSwitch {
  const sessions = (): SessionsFace | undefined => {
    const service = get('sessions')
    return hasMethod(service, 'clear') ? service as unknown as SessionsFace : undefined
  }
  const workspaces = (): WorkspaceFace | undefined => {
    for (const name of ['uiWorkspace', 'workspaces']) {
      const service = get(name)
      if (hasMethod(service, 'startSession')) return service as unknown as WorkspaceFace
    }
    return undefined
  }
  return {
    forgetCurrent() {
      sessions()?.clear()
    },
    startNew() {
      const workspace = workspaces()
      if (workspace !== undefined) {
        void workspace.startSession()
        return
      }
      // Without a workspace service, deselecting still leaves the old
      // conversation; the empty view is where a new one starts.
      sessions()?.clear()
    },
  }
}
