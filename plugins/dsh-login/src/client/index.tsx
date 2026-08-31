/**
 * Client half of dsh-login: one entry in the frame-wide overlay layer that
 * covers the whole app until a session exists.
 *
 * `shell.overlay` is the sanctioned seat for a frame-wide surface — a list, so
 * the entry is added beside the shipped ones instead of replacing anything,
 * and the layer grants pointer events to each entry, so the cover really does
 * take the clicks. The `root` slot, which would otherwise look like the place
 * for a first screen, is single: registering there would shadow the whole app
 * frame and take every seat it declares with it.
 *
 * `slots.inject` waits for the seat's declaration, so unloading this plugin —
 * or the frame — removes the gate with it.
 * @module dsh-login/client
 */
import { LoginGate } from './LoginGate.tsx'
import { browserStorage } from './session.ts'
import { provideLoginSession } from './service.ts'
import { SessionStore } from './store.ts'
import type { ClientContext } from './context-types.ts'

export { LoginGate } from './LoginGate.tsx'
export type { LoginGateProps } from './LoginGate.tsx'
export { browserStorage, clearSession, readSession, STORAGE_KEY, writeSession } from './session.ts'
export type { StorageLike, StoredSession } from './session.ts'
export { LoginSession, provideLoginSession, SERVICE_NAME } from './service.ts'
export { SessionStore } from './store.ts'
export type { Clock } from './store.ts'
export type { LoginSessionContract } from './contract.ts'
export type { ClientContext, SlotComponent, SlotListRegisterOptions, SlotRegistry } from './context-types.ts'

/** The seat this plugin contributes into. */
export const OVERLAY_SLOT = 'shell.overlay'

/** This entry's cell key in that list slot. */
export const ENTRY_ID = 'dsh-login'

/** Ascending display order; high enough that the gate covers other overlay entries. */
export const ENTRY_ORDER = 10_000

/** Services required before mounting; provided by the client runtime. */
export const inject = ['slots']

/**
 * Client plugin body.
 *
 * The store is created here and handed to both halves: `provideLoginSession`
 * publishes its read face as `ctx.loginSession` for every other plugin, and
 * the gate keeps the object itself, which is what lets it grant a session.
 * Creating it here keeps that split explicit — there is no resolution order to
 * get wrong, and no write path on the published service.
 * @param ctx - the browser cordis context carrying the slot registry.
 */
export function apply(ctx: ClientContext): void {
  const store = new SessionStore(browserStorage())
  provideLoginSession(ctx, store)
  ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
    { name: OVERLAY_SLOT, id: ENTRY_ID, order: ENTRY_ORDER },
    () => LoginGate({ store }),
  ))
}
