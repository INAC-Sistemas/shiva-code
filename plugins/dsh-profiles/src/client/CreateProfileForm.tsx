/**
 * Authoring a profile from the picker, so the panel is not the only way in.
 *
 * The form mirrors the plugin manager's: a name, an optional description, every
 * composable plugin, and every published library skill. It offers what the
 * server says exists rather than a local list, because the library is the
 * server's and a hardcoded copy would go stale the first time an admin
 * publishes something.
 *
 * Nothing here re-states what a valid profile is. The draft goes upstream as
 * typed and the plugin manager refuses it with a message this form shows: the
 * rules have one home, and it is the half that stores profiles.
 * @module dsh-profiles/client/CreateProfileForm
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createProfile, fetchCatalog } from './api.ts'
import {
  BADGE, CHECK_BOX, CHECK_HINT, CHECK_ROW, CHECK_TEXT, ERROR, FIELD, FOOTER,
  INPUT, LABEL, NOTE, PRIMARY, SECONDARY, SUBTITLE, TITLE,
} from './styles.ts'
import type { ProfileCatalog, ProfileSummary } from '../wire.ts'

/** Props of {@link CreateProfileForm}. */
export interface CreateProfileFormProps {
  /** Runs with the created profile, which the picker then makes active. */
  onCreated: (profile: ProfileSummary) => void
  /** Runs when the person backs out; the picker returns to the roster. */
  onCancel: () => void
}

/** Add or remove one id, keeping the set the checkboxes read from. */
function toggled(selected: readonly string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter(entry => entry !== id)
    : [...selected, id]
}

/**
 * The authoring form.
 * @param props - see {@link CreateProfileFormProps}.
 * @returns the form element tree.
 */
export function CreateProfileForm({ onCreated, onCancel }: CreateProfileFormProps): ReactNode {
  const [catalog, setCatalog] = useState<ProfileCatalog | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [plugins, setPlugins] = useState<string[]>([])
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const controller = new AbortController()
    void fetchCatalog(controller.signal).then(answer => {
      if (controller.signal.aborted) return
      setCatalog(answer)
      setLoading(false)
    })
    return () => controller.abort()
  }, [])

  const submit = async (): Promise<void> => {
    setSaving(true)
    setError(undefined)
    const result = await createProfile({
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
      plugins,
      skillIds,
    })
    if (!result.ok) {
      setSaving(false)
      setError(result.message)
      return
    }
    onCreated(result.profile)
  }

  return (
    <>
      <h1 style={TITLE}>Criar perfil</h1>
      <p style={SUBTITLE}>
        Um perfil é o recorte de skills e plugins que o agente enxerga enquanto
        roda sob ele.
      </p>

      {error === undefined ? null : <p style={ERROR}>{error}</p>}

      <label style={FIELD}>
        <span style={LABEL}>Nome</span>
        <input
          style={INPUT}
          value={name}
          placeholder="Desenvolvimento"
          onChange={event => { setName(event.target.value) }}
        />
      </label>

      <label style={FIELD}>
        <span style={LABEL}>Descrição</span>
        <input
          style={INPUT}
          value={description}
          placeholder="Opcional — aparece no seletor de perfil"
          onChange={event => { setDescription(event.target.value) }}
        />
      </label>

      {loading ? <p style={NOTE}>Carregando o catálogo…</p> : null}

      {/* An unreadable catalog is shown as such: authoring against an empty
          form would silently produce a profile that grants nothing. */}
      {!loading && catalog === undefined
        ? <p style={ERROR}>Não foi possível ler o catálogo. Tente de novo.</p>
        : null}

      {catalog === undefined ? null : (
        <>
          <div style={FIELD}>
            <span style={LABEL}>Plugins</span>
            <p style={NOTE}>
              Marcados com <strong>reinício</strong> só carregam no início do
              aplicativo: ligá-los ou desligá-los pede reabrir o Shiva Code.
            </p>
            <div style={CHECK_BOX}>
              {catalog.plugins.map(plugin => (
                <label key={plugin.id} style={CHECK_ROW}>
                  <input
                    type="checkbox"
                    checked={plugins.includes(plugin.id)}
                    onChange={() => { setPlugins(current => toggled(current, plugin.id)) }}
                  />
                  <span style={CHECK_TEXT}>
                    <span>
                      {plugin.label}
                      {plugin.plane === 'host' ? <span style={BADGE}>reinício</span> : null}
                    </span>
                    <span style={CHECK_HINT} title={plugin.hint}>{plugin.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={FIELD}>
            <span style={LABEL}>Skills da biblioteca</span>
            <p style={NOTE}>
              Só as marcadas chegam ao modelo neste perfil. As skills locais da
              máquina continuam valendo.
            </p>
            {catalog.skills.length === 0
              ? <p style={NOTE}>Nenhuma skill publicada na biblioteca.</p>
              : (
                <div style={CHECK_BOX}>
                  {catalog.skills.map(skill => (
                    <label key={skill.id} style={CHECK_ROW}>
                      <input
                        type="checkbox"
                        checked={skillIds.includes(skill.id)}
                        onChange={() => { setSkillIds(current => toggled(current, skill.id)) }}
                      />
                      <span style={CHECK_TEXT}>
                        <span>{skill.name}</span>
                        <span style={CHECK_HINT} title={skill.description}>
                          {skill.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
          </div>
        </>
      )}

      <div style={FOOTER}>
        <button
          type="button"
          style={PRIMARY}
          disabled={saving || name.trim() === ''}
          onClick={() => { void submit() }}
        >
          {saving ? 'Criando…' : 'Criar perfil'}
        </button>
        <button type="button" style={SECONDARY} onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </>
  )
}
