/**
 * Client half of dsh-clock: one list entry in the conversation session
 * header's utilities row.
 *
 * `slots.inject` waits for the seat's declaration — the row is declared by
 * whoever occupies `conversation.session.header`, so it comes and goes with
 * the conversation surface — and `slots.register` contributes the clock into
 * it under a fresh id, beside the shipped entries rather than replacing one.
 * `order: -100` places it left of the "Session log" capsule, which registers
 * without an order and therefore sorts at 0.
 */
import { Clock } from './Clock.tsx'
import type { ClientContext } from '../context-types.ts'

/** The seat this plugin contributes into. */
export const UTILITIES_SLOT = 'conversation.session.header.utilities'

/** This entry's cell key in that list slot. */
export const ENTRY_ID = 'dsh-clock'

/** Ascending display order; below the shipped "Session log" entry's implicit 0. */
export const ENTRY_ORDER = -100

/** Services required before mounting; provided by the client runtime. */
export const inject = ['slots']

/**
 * Client plugin body.
 * @param ctx - the browser cordis context carrying the slot registry.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(UTILITIES_SLOT, () => ctx.slots.register(
    { name: UTILITIES_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    Clock,
  ))
}
