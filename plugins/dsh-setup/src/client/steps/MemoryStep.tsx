/**
 * Step 3 (optional): the OpenViking memory.
 *
 * Offered only when the active profile loads `dsh-openviking`. The embedding
 * endpoint is required by OpenViking and the VLM is optional; both are tested
 * by this plugin's host half, which also reports the embedding width, and then
 * saved through `dsh-openviking`'s own configure route.
 * @module dsh-setup/client/steps/MemoryStep
 */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { MEMORY_CONFIGURE, MEMORY_MODELS, post } from '../api.ts'
import type { MemoryModels, MemoryStatus } from '../api.ts'
import {
  CHECK_ROW, ERROR, FIELD, FOOTER, INPUT, LABEL, LINK, NOTE, PRIMARY, SECONDARY, SPACER,
} from '../styles.ts'
import { MEMORY_PRESETS } from '../../providers.ts'
import { MEMORY_TEST_ROUTE } from '../../wire.ts'
import type { MemoryChoice, MemoryTestResult } from '../../wire.ts'

/** Props of {@link MemoryStep}. */
export interface MemoryStepProps {
  /** `dsh-openviking`'s status. */
  status: MemoryStatus
  /** Whether `OPENROUTER_API_KEY` resolves (possibly stored by an earlier step). */
  openrouterKey: boolean
  /**
   * Called when the person saved or skipped the memory.
   * @param choice - what they decided.
   * @param label - what the summary shows.
   */
  onDone: (choice: MemoryChoice, label: string) => void
  /** Return to the previous step. */
  onBack: () => void
}

/**
 * Render the memory step.
 * @param props - the plugin status and navigation callbacks.
 * @returns the step body and actions.
 */
export function MemoryStep({ status, openrouterKey, onDone, onBack }: MemoryStepProps): ReactNode {
  const [presetId, setPresetId] = useState(openrouterKey ? 'openrouter' : 'openai')
  const preset = MEMORY_PRESETS.find(candidate => candidate.provider === presetId) ?? MEMORY_PRESETS[0]!
  const [base, setBase] = useState(preset.base)
  const [apiKey, setApiKey] = useState('')
  const [embedding, setEmbedding] = useState('')
  const [useVlm, setUseVlm] = useState(false)
  const [vlm, setVlm] = useState('')
  const [suggestions, setSuggestions] = useState<{ embedding: string[], vision: string[] }>({ embedding: [], vision: [] })
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const ids = { preset: useId(), base: useId(), key: useId(), embedding: useId(), vlm: useId(), embeddingList: useId(), vlmList: useId() }

  useEffect(() => {
    if (presetId !== 'openrouter' || !openrouterKey) {
      setSuggestions({ embedding: [], vision: [] })
      return
    }
    const controller = new AbortController()
    void post<MemoryModels>(MEMORY_MODELS, {}, controller.signal).then((answer) => {
      if (controller.signal.aborted || !answer.ok) return
      setSuggestions({ embedding: answer.embedding, vision: answer.vision })
    })
    return () => controller.abort()
  }, [presetId, openrouterKey])

  const storedKeyCovers = preset.provider === 'openrouter' && openrouterKey
  const keyMissing = preset.needsKey && apiKey.trim() === '' && !storedKeyCovers
  const incomplete = base.trim() === '' || embedding.trim() === '' || keyMissing || (useVlm && vlm.trim() === '')

  const draft = (model: string) => ({
    provider: preset.provider,
    api_base: base.trim(),
    api_key: preset.needsKey ? apiKey.trim() : '',
    model: model.trim(),
  })

  const save = async (): Promise<void> => {
    setError(undefined)
    setBusy('Testando o embedding…')
    const tested = await post<Extract<MemoryTestResult, { ok: true }>>(MEMORY_TEST_ROUTE, {
      embedding: draft(embedding),
      ...(useVlm ? { vlm: draft(vlm) } : {}),
    })
    if (!tested.ok) {
      setBusy(undefined)
      setError(tested.message)
      return
    }
    setBusy('Salvando e iniciando o servidor de memória…')
    const saved = await post<{ ok: true }>(MEMORY_CONFIGURE, {
      embedding: { ...draft(embedding), dimension: tested.dimension },
      vlm: useVlm ? draft(vlm) : null,
    })
    setBusy(undefined)
    if (!saved.ok) {
      setError(saved.message)
      return
    }
    onDone('configured', `${preset.label} · ${embedding.trim()}${useVlm ? ` + ${vlm.trim()}` : ''}`)
  }

  const disabled = busy !== undefined

  return (
    <>
      <p style={NOTE}>
        Opcional. O OpenViking dá ao agente uma memória de longo prazo e precisa de um modelo de
        embedding; um modelo de visão (VLM) é opcional.
        {status.installed ? '' : ' O servidor ainda está sendo instalado em segundo plano: a configuração fica salva e ele sobe quando terminar.'}
      </p>

      <div style={FIELD}>
        <label style={LABEL} htmlFor={ids.preset}>Provedor</label>
        <select
          id={ids.preset}
          style={INPUT}
          value={presetId}
          disabled={disabled}
          onChange={(event) => {
            const next = MEMORY_PRESETS.find(candidate => candidate.provider === event.target.value)
            setPresetId(event.target.value)
            setBase(next?.base ?? '')
            setError(undefined)
          }}
        >
          {MEMORY_PRESETS.map(candidate => <option key={candidate.provider} value={candidate.provider}>{candidate.label}</option>)}
        </select>
        <span style={NOTE}>{preset.hint}</span>
      </div>

      <div style={FIELD}>
        <label style={LABEL} htmlFor={ids.base}>Endereço da API</label>
        <input
          id={ids.base}
          style={INPUT}
          spellCheck={false}
          value={base}
          disabled={disabled}
          placeholder="https://…/v1"
          onChange={(event) => { setBase(event.target.value) }}
        />
      </div>

      {preset.needsKey ? (
        <div style={FIELD}>
          <label style={LABEL} htmlFor={ids.key}>Chave de API</label>
          <input
            id={ids.key}
            style={INPUT}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            disabled={disabled}
            placeholder={storedKeyCovers ? 'Usa a chave do OpenRouter já salva. Deixe em branco para mantê-la.' : 'Cole a chave de API'}
            onChange={(event) => { setApiKey(event.target.value) }}
          />
        </div>
      ) : null}

      <div style={FIELD}>
        <label style={LABEL} htmlFor={ids.embedding}>Modelo de embedding</label>
        <input
          id={ids.embedding}
          style={INPUT}
          list={ids.embeddingList}
          spellCheck={false}
          value={embedding}
          disabled={disabled}
          placeholder="ex.: openai/text-embedding-3-small"
          onChange={(event) => { setEmbedding(event.target.value) }}
        />
        <datalist id={ids.embeddingList}>
          {suggestions.embedding.map(id => <option key={id} value={id} />)}
        </datalist>
      </div>

      <label style={CHECK_ROW}>
        <input type="checkbox" checked={useVlm} disabled={disabled} onChange={(event) => { setUseVlm(event.target.checked) }} />
        Usar também um modelo de visão (VLM), no mesmo endereço e chave
      </label>

      {useVlm ? (
        <div style={FIELD}>
          <label style={LABEL} htmlFor={ids.vlm}>Modelo de visão</label>
          <input
            id={ids.vlm}
            style={INPUT}
            list={ids.vlmList}
            spellCheck={false}
            value={vlm}
            disabled={disabled}
            placeholder="ex.: google/gemini-2.0-flash-001"
            onChange={(event) => { setVlm(event.target.value) }}
          />
          <datalist id={ids.vlmList}>
            {suggestions.vision.map(id => <option key={id} value={id} />)}
          </datalist>
        </div>
      ) : null}

      {error === undefined ? null : <p style={ERROR}>{error}</p>}
      {busy === undefined ? null : <p style={NOTE}>{busy}</p>}

      <div style={FOOTER}>
        <button type="button" style={SECONDARY} disabled={disabled} onClick={onBack}>Voltar</button>
        <button type="button" style={LINK} disabled={disabled} onClick={() => { onDone('skipped', 'Pulado') }}>
          Pular
        </button>
        {status.configured ? (
          <button type="button" style={LINK} disabled={disabled} onClick={() => { onDone('configured', 'Configuração atual mantida') }}>
            Manter a configuração atual
          </button>
        ) : null}
        <span style={SPACER} />
        <button
          type="button"
          style={incomplete ? { ...PRIMARY, opacity: 0.5 } : PRIMARY}
          disabled={disabled || incomplete}
          onClick={() => { void save() }}
        >
          {disabled ? 'Aguarde…' : 'Testar e salvar'}
        </button>
      </div>
    </>
  )
}
