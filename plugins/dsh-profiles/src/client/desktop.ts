/**
 * The desktop shell's renderer bridge, as far as this plugin needs it.
 *
 * The page is served by the harness and runs in a plain browser just as well,
 * so the bridge is optional by nature: `undefined` means "not inside the
 * desktop shell", which is a normal state and not a failure. Every caller has
 * to have an answer for it — here, the manual instruction the modal carried
 * before the button existed.
 *
 * The shape is checked at runtime rather than trusted: this object is injected
 * by another process's preload, so it is a boundary, and an older shell that
 * predates the method would otherwise fail as a TypeError inside a click.
 * @module dsh-profiles/client/desktop
 */

/** What this plugin uses of `window.dshDesktop`. */
export interface DesktopBridge {
  /**
   * Restart the harness process the page is served by.
   *
   * This is what applies a profile: the shell reads the selection file when it
   * spawns the harness, so the plugin list is settled at that moment and a
   * fresh spawn is what picks up a new one. The shell shows its splash, starts
   * again and points the window back at the harness, so from the person's side
   * it is the app restarting.
   * @returns whether the harness came back ready.
   */
  restartHarness: () => Promise<{ ok: boolean }>
}

/**
 * The bridge, when the page is running inside the desktop shell.
 * @returns the bridge, or `undefined` in a plain browser or an older shell.
 */
export function desktopBridge(): DesktopBridge | undefined {
  const candidate = (globalThis as { dshDesktop?: unknown }).dshDesktop
  if (typeof candidate !== 'object' || candidate === null) return undefined
  const { restartHarness } = candidate as { restartHarness?: unknown }
  return typeof restartHarness === 'function'
    ? (candidate as DesktopBridge)
    : undefined
}
