/**
 * The same-origin calls the picker makes against this plugin's host half.
 *
 * The browser never talks to the plugin manager directly: the host half holds
 * the session and the endpoints. That keeps the exchange same-origin, so the
 * plugin manager needs no CORS grant, and keeps the bearer token out of the
 * page.
 * @module dsh-profiles/client/api
 */
import { CATALOG_ROUTE, CREATE_ROUTE, SELECT_ROUTE, STATE_ROUTE } from '../wire.ts'
import type {
  CreateResult, ProfileCatalog, ProfileDraft, ProfileState, SelectResult,
} from '../wire.ts'

/**
 * Read the roster and this machine's selection.
 * @param signal - aborts the request when the gate unmounts.
 * @returns the state, or the signed-out state when anything goes wrong —
 * an unreachable host half must leave the picker waiting, not assert that the
 * user has no profiles.
 */
export async function fetchState(signal?: AbortSignal): Promise<ProfileState> {
  try {
    const response = await fetch(STATE_ROUTE, {
      headers: { accept: 'application/json' },
      ...(signal === undefined ? {} : { signal }),
    })
    if (!response.ok) return { signedIn: false }
    return await response.json() as ProfileState
  } catch {
    // Aborted, offline, or a non-JSON answer. Nothing else reaches this catch;
    // every one of them means "cannot show a roster yet".
    return { signedIn: false }
  }
}

/**
 * Make one profile the active one.
 * @param profileId - the profile to select.
 * @returns the recorded selection, or the reason it did not happen.
 */
export async function selectProfile(profileId: string): Promise<SelectResult> {
  let response: Response
  try {
    response = await fetch(SELECT_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ profileId }),
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'the request failed',
    }
  }
  try {
    return await response.json() as SelectResult
  } catch {
    return { ok: false, message: `the app answered ${response.status}` }
  }
}

/**
 * Read what a new profile can be built from.
 * @param signal - aborts the request when the form unmounts.
 * @returns the catalog, or `undefined` when it could not be read — the form
 * shows that as a failure to load rather than as an empty library, which would
 * invite authoring a profile that grants nothing.
 */
export async function fetchCatalog(signal?: AbortSignal): Promise<ProfileCatalog | undefined> {
  try {
    const response = await fetch(CATALOG_ROUTE, {
      headers: { accept: 'application/json' },
      ...(signal === undefined ? {} : { signal }),
    })
    if (!response.ok) return undefined
    return await response.json() as ProfileCatalog
  } catch {
    // Aborted, offline, or a non-JSON answer — all of them "no catalog yet".
    return undefined
  }
}

/**
 * Author one profile.
 * @param draft - the profile to create.
 * @returns the created profile, or the reason it was refused.
 */
export async function createProfile(draft: ProfileDraft): Promise<CreateResult> {
  let response: Response
  try {
    response = await fetch(CREATE_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(draft),
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'the request failed',
    }
  }
  try {
    return await response.json() as CreateResult
  } catch {
    return { ok: false, message: `the app answered ${response.status}` }
  }
}
