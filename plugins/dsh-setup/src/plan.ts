/**
 * Whether the wizard opens, and which steps it shows.
 *
 * A pure function of facts read on this machine, so the gate and its tests
 * agree on one rule. The completion marker alone is not trusted: a key removed
 * after setup leaves a tool that cannot run, so the wizard opens again for it.
 *
 * This module must stay free of Node.js and React value imports: the browser
 * bundle compiles it.
 * @module dsh-setup/plan
 */
import type { SetupMarker } from './wire.ts'

/**
 * The wizard version. Raising it opens the wizard once more on every machine,
 * which is how a new required step reaches people who already finished.
 */
export const SETUP_VERSION = '2026-09-17.1'

/**
 * Whether the memory step must wait instead of offering its form.
 *
 * `dsh-openviking` starts installing by itself when it boots — a Python in
 * range, a venv, the pinned wheel — so on a fresh machine the wizard reaches
 * this step while that is still running. Configuring against a server that
 * does not exist yet reads as "it saved and nothing happened", so the step
 * waits. A failed install stops the wait: nothing it could show would change,
 * and the form's own note says the server comes up once it is installed.
 * @param status - the plugin's status as its route reports it.
 * @returns true while the step should show the installer's progress.
 */
export function memoryInstalling(status: { installed: boolean, phase: string }): boolean {
  return !status.installed && status.phase !== 'error'
}

/** One screen of the wizard, in display order. */
export type StepId = 'chat' | 'image' | 'memory' | 'summary'

/**
 * Offer the memory step to a wizard that opened without it.
 *
 * Which steps exist is decided when the wizard opens, and `dsh-openviking` may
 * still be booting then: its status route answers late, and the step would be
 * missing for the whole run — the person reaches the end never having been
 * asked about memory. Every finished step re-reads the facts, so the step is
 * inserted in its own place, before the summary, the moment the route answers.
 *
 * A wizard already showing the summary keeps it: bouncing someone back from
 * the last screen to an optional step they were never offered reads as the
 * wizard restarting itself.
 * @param steps - the steps as planned so far.
 * @param index - the step being shown.
 * @returns the steps, with `memory` inserted when it belongs and is missing.
 */
export function withMemoryStep(steps: readonly StepId[], index: number): StepId[] {
  if (steps.includes('memory')) return [...steps]
  const summary = steps.indexOf('summary')
  if (summary === -1 || index >= summary) return [...steps]
  return [...steps.slice(0, summary), 'memory', ...steps.slice(summary)]
}

/** The facts {@link planSetup} decides from. */
export interface SetupFacts {
  /** Whether the default chat route can serve a request. */
  chatReady: boolean
  /** The image generator: loaded at all, and holding a model plus its key. */
  image: { available: boolean, configured: boolean }
  /** The OpenViking memory: loaded by the active profile at all. */
  memory: { available: boolean }
  marker: SetupMarker
}

/** The decision. */
export interface SetupPlan {
  open: boolean
  steps: StepId[]
}

/**
 * Decide whether the wizard covers the app.
 *
 * It opens while the marker names another version, while chat cannot serve,
 * or while a loaded image generator has no model or key. The memory step is
 * optional: it is offered whenever its plugin is loaded, and never by itself
 * reopens the wizard.
 * @param facts - what this machine currently holds.
 * @returns whether to open, and the steps in order (empty when closed).
 */
export function planSetup(facts: SetupFacts): SetupPlan {
  const current = facts.marker.completedVersion === SETUP_VERSION
  const imageMissing = facts.image.available && !facts.image.configured
  if (current && facts.chatReady && !imageMissing) return { open: false, steps: [] }

  const steps: StepId[] = ['chat']
  if (facts.image.available) steps.push('image')
  if (facts.memory.available) steps.push('memory')
  steps.push('summary')
  return { open: true, steps }
}
