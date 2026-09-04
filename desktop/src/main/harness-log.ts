import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Append one line of desktop-side evidence to the Harness log.
 *
 * A packaged main process has no log of its own — its `console` output reaches
 * nothing the user can open — so desktop evidence shares the file behind the
 * "Show Harness Log" menu item. The Harness runtime holds an append stream on
 * the same path; both write whole lines, so they interleave by line.
 *
 * Never throws: a failure to record must not take down what it was recording.
 *
 * @param message One line, without a trailing newline. Prefix it with the
 *   subsystem in brackets so the log stays greppable.
 */
export function appendHarnessLog(message: string): void {
  try {
    appendFileSync(join(app.getPath('logs'), 'harness.log'), `${message}\n`, 'utf8')
  } catch (error) {
    console.warn('[desktop] failed to append to the harness log', error)
  }
}
