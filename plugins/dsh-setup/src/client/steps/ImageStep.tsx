/**
 * Step 2: the image generator (`dsh-assets`).
 *
 * The key is tested and stored by this plugin's host half; the provider and
 * model are then saved through `dsh-assets`' own settings route, which stays
 * the only writer of that plugin's settings.
 * @module dsh-setup/client/steps/ImageStep
 */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ASSETS_CONFIG, ASSETS_MODELS, post } from '../api.ts'
import type { AssetsModels, AssetsStatus } from '../api.ts'
import {
  CHOICE, CHOICE_HINT, CHOICE_SELECTED, ERROR, FIELD, FOOTER, GRID, INPUT, LABEL, LINK, NOTE,
  PRIMARY, SECONDARY, SPACER,
} from '../styles.ts'
import { IMAGE_PROVIDERS } from '../../providers.ts'
import { IMAGE_CONNECT_ROUTE } from '../../wire.ts'
import type { ImageProvider, OkResult, SetupState } from '../../wire.ts'

/** Props of {@link ImageStep}. */
export interface ImageStepProps {
  /** `dsh-assets`' saved settings. */
  assets: AssetsStatus
  /** Which image keys already resolve. */
  keys: SetupState['imageKeys']
  /**
   * Called once an image model and its key are saved.
   * @param label - what the summary shows.
   */
  onDone: (label: string) => void
  /** Return to the previous step. */
  onBack: () => void
}

/**
 * Narrow a stored provider id to one this step offers.
 * @param value - the stored id.
 * @returns the provider, defaulting to OpenRouter.
 */
function asProvider(value: string): ImageProvider {
  return value === 'fal' ? 'fal' : 'openrouter'
}

/**
 * Render the image step.
 * @param props - the saved settings, key facts and navigation callbacks.
 * @returns the step body and actions.
 */
export function ImageStep({ assets, keys, onDone, onBack }: ImageStepProps): ReactNode {
  const stored = assets.settings
  const [provider, setProvider] = useState<ImageProvider>(asProvider(stored.provider))
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(stored.imageModel)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const keyId = useId()
  const modelId = useId()
  const listId = useId()

  useEffect(() => {
    const controller = new AbortController()
    setModels([])
    setModel(provider === asProvider(stored.provider) ? stored.imageModel : '')
    void post<AssetsModels>(ASSETS_MODELS, { provider, kind: 'image' }, controller.signal).then((answer) => {
      if (controller.signal.aborted || !answer.ok) return
      setModels(answer.models)
    })
    return () => controller.abort()
  }, [provider, stored.provider, stored.imageModel])

  const entry = IMAGE_PROVIDERS.find(candidate => candidate.provider === provider)
  const keyMissing = apiKey.trim() === '' && !keys[provider]
  const alreadyConfigured = stored.imageModel !== '' && keys[asProvider(stored.provider)]

  const save = async (): Promise<void> => {
    const chosen = model.trim()
    setBusy(true)
    setError(undefined)
    const connected: OkResult = await post(IMAGE_CONNECT_ROUTE, { provider, apiKey: apiKey.trim() })
    if (!connected.ok) {
      setBusy(false)
      setError(connected.message)
      return
    }
    const saved = await post<{ ok: true }>(ASSETS_CONFIG, { provider, imageModel: chosen })
    setBusy(false)
    if (!saved.ok) {
      setError(`A chave foi salva, mas o modelo não: ${saved.message}`)
      return
    }
    setApiKey('')
    onDone(`${entry?.label ?? provider} · ${chosen}`)
  }

  return (
    <>
      <div style={GRID} role="radiogroup" aria-label="Provedor de imagem">
        {IMAGE_PROVIDERS.map(candidate => (
          <button
            key={candidate.provider}
            type="button"
            role="radio"
            aria-checked={candidate.provider === provider}
            style={candidate.provider === provider ? CHOICE_SELECTED : CHOICE}
            disabled={busy}
            onClick={() => {
              setProvider(candidate.provider)
              setError(undefined)
            }}
          >
            <span>{candidate.label}</span>
            <span style={CHOICE_HINT}>{keys[candidate.provider] ? 'chave salva' : 'sem chave'}</span>
          </button>
        ))}
      </div>
      {entry === undefined ? null : <p style={NOTE}>{entry.hint}</p>}

      <div style={FIELD}>
        <label style={LABEL} htmlFor={keyId}>Chave de API · {entry?.label ?? provider}</label>
        <input
          id={keyId}
          style={INPUT}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          disabled={busy}
          placeholder={keys[provider] ? 'Chave já salva. Deixe em branco para mantê-la.' : 'Cole a chave de API'}
          onChange={(event) => { setApiKey(event.target.value) }}
        />
      </div>

      <div style={FIELD}>
        <label style={LABEL} htmlFor={modelId}>Modelo de imagem</label>
        <input
          id={modelId}
          style={INPUT}
          list={listId}
          spellCheck={false}
          value={model}
          disabled={busy}
          placeholder="Escolha ou digite o id do modelo"
          onChange={(event) => { setModel(event.target.value) }}
        />
        <datalist id={listId}>
          {models.map(id => <option key={id} value={id} />)}
        </datalist>
      </div>

      {error === undefined ? null : <p style={ERROR}>{error}</p>}

      <div style={FOOTER}>
        <button type="button" style={SECONDARY} disabled={busy} onClick={onBack}>Voltar</button>
        {alreadyConfigured ? (
          <button
            type="button"
            style={LINK}
            disabled={busy}
            onClick={() => { onDone(`${IMAGE_PROVIDERS.find(c => c.provider === asProvider(stored.provider))?.label ?? stored.provider} · ${stored.imageModel}`) }}
          >
            Manter a configuração atual
          </button>
        ) : null}
        <span style={SPACER} />
        <button
          type="button"
          style={keyMissing || model.trim() === '' ? { ...PRIMARY, opacity: 0.5 } : PRIMARY}
          disabled={busy || keyMissing || model.trim() === ''}
          onClick={() => { void save() }}
        >
          {busy ? 'Testando…' : 'Testar e continuar'}
        </button>
      </div>
    </>
  )
}
