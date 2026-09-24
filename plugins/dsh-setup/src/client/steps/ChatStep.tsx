/**
 * Step 1: the chat model.
 *
 * The person picks a provider, pastes its key and picks a model. "Testar e
 * continuar" sends one tiny request through the harness with that key; only a
 * route that answers is saved as the default model, and a rejected key never
 * replaces a stored one.
 * @module dsh-setup/client/steps/ChatStep
 */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { post } from '../api.ts'
import {
  CHOICE, CHOICE_HINT, CHOICE_SELECTED, ERROR, FIELD, FOOTER, GRID, INPUT, LABEL, LINK, NOTE,
  PRIMARY, SPACER,
} from '../styles.ts'
import { CHAT_CONNECT_ROUTE, CHAT_MODELS_ROUTE, CHAT_PROVIDERS_ROUTE } from '../../wire.ts'
import type {
  ChatProviderOption, ChatProvidersResult, ModelOption, ModelsResult, OkResult, SetupState,
} from '../../wire.ts'

/** Props of {@link ChatStep}. */
export interface ChatStepProps {
  /** The current default chat selection. */
  chat: SetupState['chat']
  /**
   * Called once the step holds a working chat model.
   * @param label - what the summary shows.
   */
  onDone: (label: string) => void
}

/**
 * Render the chat step.
 * @param props - the current selection and the completion callback.
 * @returns the step body and actions.
 */
export function ChatStep({ chat, onDone }: ChatStepProps): ReactNode {
  const [providers, setProviders] = useState<ChatProviderOption[] | undefined>(undefined)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [models, setModels] = useState<ModelOption[]>([])
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const keyId = useId()
  const modelId = useId()
  const listId = useId()

  useEffect(() => {
    const controller = new AbortController()
    void post<Extract<ChatProvidersResult, { ok: true }>>(CHAT_PROVIDERS_ROUTE, {}, controller.signal).then((answer) => {
      if (controller.signal.aborted) return
      if (!answer.ok) {
        setError(answer.message)
        setProviders([])
        return
      }
      setProviders(answer.providers)
      const current = answer.providers.find(option => option.provider === chat.provider)
      setSelected((current ?? answer.providers.find(option => option.configured) ?? answer.providers[0])?.provider)
    })
    return () => controller.abort()
  }, [chat.provider])

  useEffect(() => {
    if (selected === undefined) return
    const controller = new AbortController()
    setModels([])
    setModel(selected === chat.provider && chat.model !== null ? chat.model : '')
    void post<Extract<ModelsResult, { ok: true }>>(CHAT_MODELS_ROUTE, { provider: selected }, controller.signal).then((answer) => {
      if (controller.signal.aborted || !answer.ok) return
      setModels(answer.models)
      setModel(current => current !== '' ? current : answer.models[0]?.id ?? '')
    })
    return () => controller.abort()
  }, [selected, chat.provider, chat.model])

  const option = providers?.find(candidate => candidate.provider === selected)
  const label = (provider: string, id: string): string =>
    `${providers?.find(candidate => candidate.provider === provider)?.displayName ?? provider} · ${id}`

  const connect = async (): Promise<void> => {
    if (selected === undefined) return
    setBusy(true)
    setError(undefined)
    const answer: OkResult = await post(CHAT_CONNECT_ROUTE, { provider: selected, model: model.trim(), apiKey: apiKey.trim() })
    setBusy(false)
    if (!answer.ok) {
      setError(answer.message)
      return
    }
    setApiKey('')
    onDone(label(selected, model.trim()))
  }

  if (providers === undefined) return <p style={NOTE}>Carregando provedores…</p>

  const keyMissing = apiKey.trim() === '' && option?.configured !== true

  return (
    <>
      {chat.ready && chat.provider !== null && chat.model !== null
        ? <p style={NOTE}>Modelo atual: <strong>{label(chat.provider, chat.model)}</strong>. Você pode mantê-lo ou trocar agora.</p>
        : null}

      <div style={GRID} role="radiogroup" aria-label="Provedor do chat">
        {providers.map(candidate => (
          <button
            key={candidate.provider}
            type="button"
            role="radio"
            aria-checked={candidate.provider === selected}
            style={candidate.provider === selected ? CHOICE_SELECTED : CHOICE}
            disabled={busy}
            onClick={() => {
              setSelected(candidate.provider)
              setError(undefined)
            }}
          >
            <span>{candidate.displayName}</span>
            <span style={CHOICE_HINT}>{candidate.configured ? `${candidate.kind} · chave salva` : candidate.kind}</span>
          </button>
        ))}
      </div>

      {option === undefined ? null : (
        <>
          <div style={FIELD}>
            <label style={LABEL} htmlFor={keyId}>Chave de API · {option.displayName}</label>
            <input
              id={keyId}
              style={INPUT}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              disabled={busy}
              placeholder={option.configured ? 'Chave já salva. Deixe em branco para mantê-la.' : 'Cole a chave de API'}
              onChange={(event) => { setApiKey(event.target.value) }}
            />
          </div>

          <div style={FIELD}>
            <label style={LABEL} htmlFor={modelId}>Modelo</label>
            <input
              id={modelId}
              style={INPUT}
              list={listId}
              spellCheck={false}
              value={model}
              disabled={busy}
              placeholder={models.length === 0 ? 'Digite o id do modelo' : 'Escolha ou digite o id do modelo'}
              onChange={(event) => { setModel(event.target.value) }}
            />
            <datalist id={listId}>
              {models.map(entry => <option key={entry.id} value={entry.id}>{entry.name ?? entry.id}</option>)}
            </datalist>
          </div>
        </>
      )}

      {providers.length === 0 && error === undefined
        ? <p style={ERROR}>Nenhum provedor de chat está disponível nesta instalação.</p>
        : null}
      {error === undefined ? null : <p style={ERROR}>{error}</p>}

      <div style={FOOTER}>
        {chat.ready && chat.provider !== null && chat.model !== null ? (
          <button
            type="button"
            style={LINK}
            disabled={busy}
            onClick={() => { onDone(label(chat.provider as string, chat.model as string)) }}
          >
            Manter o modelo atual
          </button>
        ) : null}
        <span style={SPACER} />
        <button
          type="button"
          style={keyMissing || model.trim() === '' ? { ...PRIMARY, opacity: 0.5 } : PRIMARY}
          disabled={busy || option === undefined || keyMissing || model.trim() === ''}
          onClick={() => { void connect() }}
        >
          {busy ? 'Testando…' : 'Testar e continuar'}
        </button>
      </div>
      {busy ? <p style={NOTE}>Enviando uma mensagem curta ao modelo para conferir a chave.</p> : null}
    </>
  )
}
