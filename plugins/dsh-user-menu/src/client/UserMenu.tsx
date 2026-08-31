/**
 * The signed-in user's badge and its menu.
 *
 * Built on the Radix dropdown primitive — the same primitive shadcn/ui and
 * ReUI build their DropdownMenu on — so the focus trap, roving keyboard
 * navigation, Escape, outside-click, and the `aria-*` wiring are the
 * primitive's, not hand-rolled. The look is this plugin's own CSS module over
 * the app's `--dsw-*` design tokens, because the project ships no Tailwind and
 * a copied utility-class markup would render unstyled.
 *
 * Renders `null` while nobody is signed in, which is the whole gating
 * mechanism for the seat: the footer slot is a list, so an entry that renders
 * nothing costs the sidebar nothing.
 * @module dsh-user-menu/client/UserMenu
 */
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { displayName, initials } from './identity.ts'
import css from './UserMenu.module.css'
import type { LoginSessionFace } from '../context-types.ts'

/** Menu copy. The app it ships with is Portuguese; see the README to change it. */
const SIGN_OUT_LABEL = 'Sair'

/** Accessible name of the trigger, since the collapsed rail shows letters only. */
const TRIGGER_LABEL = 'Conta'

/** What the badge needs: the shared session, and the sidebar's current width. */
export interface UserMenuProps {
  /** dsh-login's published session service. */
  session: LoginSessionFace
  /** True while the sidebar is expanded; false on the collapsed icon rail. */
  wide: boolean
}

/**
 * Render the badge.
 * @param props - the shared session and the sidebar width.
 * @returns the badge and its menu, or null while nobody is signed in.
 */
export function UserMenu({ session, wide }: UserMenuProps): ReactNode {
  const snapshot = useSyncExternalStore(
    listener => session.subscribe(listener),
    () => session.getSnapshot(),
  )
  const [leaving, setLeaving] = useState(false)

  const onSignOut = useCallback((): void => {
    // The local sign-out inside the service is synchronous and unconditional,
    // so this component is unmounted by the time the upstream call settles —
    // the pending flag only covers the frame before that.
    setLeaving(true)
    void session.signOut()
  }, [session])

  if (snapshot === null) return null

  const name = displayName(snapshot.user)
  const letters = initials(name)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={wide ? css['trigger'] : `${css['trigger']} ${css['collapsed']}`}
          aria-label={name === null ? TRIGGER_LABEL : `${TRIGGER_LABEL}: ${name}`}
          title={name ?? TRIGGER_LABEL}
          data-dsh-user-menu=""
        >
          <span className={css['avatar']} aria-hidden="true">{letters}</span>
          {wide && <span className={css['name']}>{name ?? TRIGGER_LABEL}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={css['content']}
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={8}
        >
          {name !== null && (
            <>
              <div className={css['header']}>
                <div className={css['headerName']}>{name}</div>
                <div className={css['headerDetail']}>{TRIGGER_LABEL}</div>
              </div>
              <DropdownMenu.Separator className={css['separator']} />
            </>
          )}
          <DropdownMenu.Item
            className={css['item']}
            disabled={leaving}
            onSelect={onSignOut}
          >
            {SIGN_OUT_LABEL}
          </DropdownMenu.Item>
      </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
