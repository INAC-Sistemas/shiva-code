/**
 * The sidebar-foot row naming the active profile, and the way to change it.
 *
 * Without this row the picker is unreachable once a profile is materialized:
 * the gate only opens itself when there is nothing to materialize, so switching
 * would mean going to the plugin manager's dashboard and reloading. Clicking
 * here opens the same picker the gate draws.
 *
 * `sidebar.footer.below` is a stacking list, so this row claims the full width
 * beside its neighbours instead of competing with them inside one flex row —
 * the reason `dsh-user-menu` moved to the same seat. It sits above the account
 * row, which is conventionally last.
 * @module dsh-profiles/client/ProfileBadge
 */
import { useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ProfileStore } from './store.ts'

const TRIGGER: CSSProperties = {
  width: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 8px',
  border: 'none',
  borderRadius: 10,
  background: 'none',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'var(--dsw-font-family)',
  fontSize: 13,
  lineHeight: '20px',
  textAlign: 'left',
  cursor: 'pointer',
}

const COLLAPSED: CSSProperties = {
  ...TRIGGER,
  width: 'auto',
  padding: 6,
  justifyContent: 'center',
}

const MARK: CSSProperties = {
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  width: 24,
  height: 24,
  borderRadius: 8,
  background: 'var(--dsw-alias-interactive-bg-hover)',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  userSelect: 'none',
}

const NAME: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}

const HINT: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 11,
  lineHeight: '16px',
}

/** Text shown while nothing is materialized — clicking it opens the picker. */
const NO_PROFILE = 'Sem perfil'

/**
 * The first two characters of a profile name, for the collapsed sidebar.
 * @param name - the profile name.
 * @returns an uppercase mark, or `··` for an empty name.
 */
export function profileMark(name: string): string {
  const trimmed = name.trim()
  return trimmed === '' ? '··' : trimmed.slice(0, 2).toUpperCase()
}

/** Props of {@link ProfileBadge}. */
export interface ProfileBadgeProps {
  /** Shared state with the gate: what is materialized, and whether to show the picker. */
  store: ProfileStore
  /** Whether the sidebar is expanded; collapsed shows the mark alone. */
  wide: boolean
}

/**
 * The profile row.
 * @param props - the shared store and the sidebar width.
 * @returns the row.
 */
export function ProfileBadge({ store, wide }: ProfileBadgeProps): ReactNode {
  const { active } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const name = active?.name ?? NO_PROFILE

  return (
    <button
      type="button"
      data-dsh-profiles="badge"
      title={`Perfil: ${name}. Clique para trocar.`}
      aria-label={`Perfil ${name}. Trocar de perfil.`}
      style={wide ? TRIGGER : COLLAPSED}
      onClick={() => store.openPicker()}
    >
      <span style={MARK}>{profileMark(name)}</span>
      {wide
        ? (
          <span style={NAME}>
            {name}
            <span style={{ ...HINT, display: 'block' }}>Trocar de perfil</span>
          </span>
        )
        : null}
    </button>
  )
}
