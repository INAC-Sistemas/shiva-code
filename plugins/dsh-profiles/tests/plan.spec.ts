import { describe, expect, it } from 'vitest'
import { grantedAtOf, planFrom } from '../src/client/ProfileGate.tsx'
import type { ActiveProfile, ProfileState, ProfileSummary } from '../src/wire.ts'

const LOGIN = 5_000

function summary(id: string, revision = 1, own = true): ProfileSummary {
  return {
    id,
    name: id,
    description: null,
    pluginCount: 1,
    skillCount: 2,
    revision,
    visibility: own ? 'PRIVATE' : 'PUBLIC',
    isOwn: own,
    ownerName: own ? 'eu' : 'admin',
  }
}

function local(id: string, revision = 1, loginGrantedAt = LOGIN): ActiveProfile {
  return { id, name: id, plugins: [], revision, loginGrantedAt }
}

function state(
  profiles: ProfileSummary[],
  serverSelectedId: string | null,
  active: ActiveProfile | null,
): ProfileState {
  return { signedIn: true, profiles, serverSelectedId, active }
}

describe('what the gate does with one reading of the state', () => {
  it('stays out of the way while nobody is signed in', () => {
    expect(planFrom({ signedIn: false }, LOGIN)).toEqual({ phase: { kind: 'done' } })
  })

  describe('after a new sign-in', () => {
    it('asks, with no way out but a choice, even when the server remembers a selection', () => {
      const profiles = [summary('p1'), summary('p2', 1, false)]
      expect(planFrom(state(profiles, 'p1', local('p1', 1, 1_000)), LOGIN))
        .toEqual({ phase: { kind: 'choosing', profiles, required: true } })
    })

    it('asks on the first start, before anything was materialized', () => {
      const profiles = [summary('p1'), summary('p2')]
      expect(planFrom(state(profiles, null, null), LOGIN))
        .toEqual({ phase: { kind: 'choosing', profiles, required: true } })
    })

    it('takes the only selectable profile without asking', () => {
      expect(planFrom(state([summary('p2', 1, false)], null, null), LOGIN))
        .toEqual({ phase: { kind: 'selecting' }, materialize: 'p2' })
    })

    it('offers creating one when nothing is selectable', () => {
      expect(planFrom(state([], null, null), LOGIN))
        .toEqual({ phase: { kind: 'choosing', profiles: [], required: true } })
    })
  })

  describe('within the same login', () => {
    it('stays out of the way when the local record matches the server', () => {
      expect(planFrom(state([summary('p1'), summary('p2')], 'p1', local('p1')), LOGIN))
        .toEqual({ phase: { kind: 'done' } })
    })

    it('materializes the selection again after it was edited in the panel', () => {
      // A rename keeps the id; only the revision says the local name and plugin
      // list are stale.
      expect(planFrom(state([summary('p1', 7)], 'p1', local('p1', 1)), LOGIN))
        .toEqual({ phase: { kind: 'selecting' }, materialize: 'p1' })
    })

    it('follows a switch made on another device', () => {
      expect(planFrom(state([summary('p1'), summary('p2')], 'p2', local('p1')), LOGIN))
        .toEqual({ phase: { kind: 'selecting' }, materialize: 'p2' })
    })

    it('asks again when the selection was deactivated, made private or deleted', () => {
      // The server stops listing it and resolves no selection.
      const profiles = [summary('p2')]
      expect(planFrom(state(profiles, null, local('p1')), LOGIN))
        .toEqual({ phase: { kind: 'choosing', profiles, required: true } })
    })
  })
})

describe('reading the login session', () => {
  it('takes grantedAt from the session dsh-login records', () => {
    expect(grantedAtOf({ token: 't', grantedAt: 42 })).toBe(42)
  })

  it('reads a session recorded before the field existed as 0', () => {
    expect(grantedAtOf({ token: 't' })).toBe(0)
    expect(grantedAtOf(null)).toBe(0)
  })
})
