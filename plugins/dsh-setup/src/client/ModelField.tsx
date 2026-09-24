/**
 * A text field that suggests ids without hiding the ones it does not know.
 *
 * Every model field in the wizard accepts an id the person types, because a
 * route may serve models the wizard never heard of. That is what a native
 * `datalist` gave, and what it gave badly: its popup grows to fit its options,
 * so a provider serving hundreds of embeddings drew a list taller than the
 * window that the host then clipped, with no scrollbar to reach the rest. The
 * list here is owned markup, capped and scrollable.
 * @module dsh-setup/client/ModelField
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { ANCHOR, CARET, FIELD, INPUT, LABEL, SUGGESTION, SUGGESTION_ACTIVE, SUGGESTIONS } from './styles.ts'
import type { ModelOption } from '../wire.ts'

/** Props of {@link ModelField}. */
export interface ModelFieldProps {
  /** Ties the label to the input; the list derives its own id from it. */
  id: string
  label: string
  /** The id currently in the field, typed or picked. */
  value: string
  /** What the route offers. An empty list leaves the field a plain input. */
  options: readonly ModelOption[]
  placeholder: string
  disabled?: boolean
  /**
   * Called on every keystroke and on every pick.
   * @param value - the id the field now holds.
   */
  onChange: (value: string) => void
}

/**
 * Match against the typed text, so a long catalog narrows as one types. The
 * whole list is offered while the field still holds what was picked, because
 * that text is a complete id, not a search.
 * @param options - what the route offers.
 * @param query - the text in the field.
 * @returns the entries to list.
 */
export function suggest(options: readonly ModelOption[], query: string): readonly ModelOption[] {
  const needle = query.trim().toLowerCase()
  if (needle === '' || options.some(entry => entry.id === query)) return options
  return options.filter(entry => `${entry.id} ${entry.name ?? ''}`.toLowerCase().includes(needle))
}

/**
 * Render the field with its suggestion list.
 * @param props - the field's label, current id, offered ids and change handler.
 * @returns the labelled field.
 */
export function ModelField({ id, label, value, options, placeholder, disabled, onChange }: ModelFieldProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const anchor = useRef<HTMLDivElement>(null)

  // A click anywhere else closes the list. Pointer-down, not blur: blur fires
  // before the click lands on an option and would cancel the pick.
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || anchor.current?.contains(event.target) !== true) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [open])

  const shown = suggest(options, value)
  const pick = (entry: ModelOption): void => {
    onChange(entry.id)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(0)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive(current => (current + step + shown.length) % Math.max(shown.length, 1))
      return
    }
    if (event.key === 'Enter' && open && shown[active] !== undefined) {
      event.preventDefault()
      pick(shown[active])
    }
  }

  return (
    <div style={FIELD}>
      <label style={LABEL} htmlFor={id}>{label}</label>
      <div style={ANCHOR} ref={anchor}>
        <input
          id={id}
          style={INPUT}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => { setOpen(options.length > 0) }}
          onKeyDown={onKeyDown}
        />
        {options.length === 0 ? null : (
          <button
            type="button"
            style={CARET}
            tabIndex={-1}
            disabled={disabled}
            aria-label={open ? 'Fechar a lista de modelos' : 'Ver os modelos disponíveis'}
            onClick={() => { setOpen(current => !current) }}
          >
            ▾
          </button>
        )}
        {!open || shown.length === 0 ? null : (
          <ul id={`${id}-list`} style={SUGGESTIONS} role="listbox">
            {shown.map((entry, position) => (
              <li
                key={entry.id}
                role="option"
                aria-selected={entry.id === value}
                style={position === active ? SUGGESTION_ACTIVE : SUGGESTION}
                onPointerEnter={() => { setActive(position) }}
                onClick={() => { pick(entry) }}
              >
                {entry.name === undefined || entry.name === entry.id ? entry.id : `${entry.id} · ${entry.name}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
