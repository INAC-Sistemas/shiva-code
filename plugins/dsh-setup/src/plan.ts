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

/** One screen of the wizard, in display order. */
export type StepId = 'chat' | 'image' | 'memory' | 'summary'

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
