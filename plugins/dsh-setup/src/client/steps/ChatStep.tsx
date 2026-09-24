/**
 * Step 1: the chat model.
 *
 * The person picks a provider, pastes its key and picks a model. "Testar e
 * continuar" sends one tiny request through the harness with that key; only a
 * route that answers is saved as the default model, and a rejected key never
 * replaces a stored one.
 *
 * The last card in the grid is an endpoint of one's own: any OpenAI-compatible
 * server — Ollama, vLLM, a company gateway — is named, interrogated for its
 * models and adopted as a route the harness keeps.
 * @module dsh-setup/client/steps/ChatStep
 */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { post } from '../api.ts'
import {
  CHOICE, CHOICE_HINT, CHOICE_SELECTED, ERROR, FIELD, FOOTER, GRID_SCROLL, INPUT, LABEL, LINK, NOTE,
  PRIMARY, SECONDARY, SPACER,
} from '../styles.ts'
import { matchChatProviders } from '../../providers.ts'
import {
  CHAT_CONNECT_ROUTE, CHAT_CUSTOM_CONNECT_ROUTE, CHAT_CUSTOM_MODELS_ROUTE, CHAT_MODELS_ROUTE,
  CHAT_PROVIDERS_ROUTE,
} from '../../wire.ts'
import type {
  ChatProviderOption, ChatProvidersResult, ModelOption, ModelsResult, OkResult, SetupState,
} from '../../wire.ts'

/**
 * The grid slot for an endpoint of one's own. It is not a provider id: it never
 * crosses the wire, and selecting it swaps the key and model fields for the
 * form that declares a new route.
 */
const CUSTOM = '\u0000custom'

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
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [models, setModels] = useState<ModelOption[]>([])
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [customName, setCustomName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [seeking, setSeeking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const searchId = useId()
  const keyId = useId()
  const modelId = useId()
  const listId = useId()
  const nameId = useId()
  const baseId = useId()

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
    setModels([])
    // The endpoint of one's own has no models until it is interrogated.
    if (selected === CUSTOM) {
      setModel('')
      return
    }
    const controller = new AbortController()
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

  /** Ask the endpoint what it serves, without declaring anything yet. */
  const seek = async (): Promise<void> => {
    setSeeking(true)
    setError(undefined)
    const answer: ModelsResult = await post(CHAT_CUSTOM_MODELS_ROUTE, { baseURL: baseURL.trim(), apiKey: apiKey.trim() })
    setSeeking(false)
    if (!answer.ok) {
      setModels([])
      setError(answer.message)
      return
    }
    setModels(answer.models)
    setModel(current => current !== '' ? current : answer.models[0]?.id ?? '')
    if (answer.models.length === 0) setError('O endereço respondeu, mas não listou nenhum modelo. Digite o id abaixo.')
  }

  const connectCustom = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    const answer: OkResult = await post(CHAT_CUSTOM_CONNECT_ROUTE, {
      displayName: customName.trim(),
      baseURL: baseURL.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
    })
    setBusy(false)
    if (!answer.ok) {
      setError(answer.message)
      return
    }
    setApiKey('')
    onDone(`${customName.trim()} · ${model.trim()}`)
  }

  if (providers === undefined) return <p style={NOTE}>Carregando provedores…</p>

  const custom = selected === CUSTOM
  const keyMissing = apiKey.trim() === '' && option?.configured !== true
  // A server of one's own often takes no key at all; the name, the address and
  // the model are what it cannot do without.
  const incomplete = custom
    ? customName.trim() === '' || baseURL.trim() === '' || model.trim() === ''
    : option === undefined || keyMissing || model.trim() === ''

  // The selection survives the filter: the key field and the model list below
  // belong to it.
  const shown = matchChatProviders(providers, query, selected)

  return (
    <>
      {chat.ready && chat.provider !== null && chat.model !== null
        ? <p style={NOTE}>Modelo atual: <strong>{label(chat.provider, chat.model)}</strong>. Você pode mantê-lo ou trocar agora.</p>
        : null}

      <div style={FIELD}>
        <label style={LABEL} htmlFor={searchId}>Buscar provedor</label>
        <input
          id={searchId}
          type="search"
          style={INPUT}
          spellCheck={false}
          value={query}
          disabled={busy}
          placeholder="Nome, rota ou tipo — DeepSeek, kimi, agregador"
          onChange={(event) => { setQuery(event.target.value) }}
        />
      </div>

      {shown.length === 0
        ? <p style={NOTE}>Nenhum provedor com esse nome. Limpe a busca para ver os {providers.length}.</p>
        : null}

      <div style={GRID_SCROLL} role="radiogroup" aria-label="Provedor do chat">
        {shown.map(candidate => (
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
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          style={custom ? CHOICE_SELECTED : CHOICE}
          disabled={busy}
          onClick={() => {
            setSelected(CUSTOM)
            setError(undefined)
          }}
        >
          <span>Personalizado</span>
          <span style={CHOICE_HINT}>Endereço próprio · compatível com OpenAI</span>
        </button>
      </div>

      {!custom ? null : (
        <>
          <div style={FIELD}>
            <label style={LABEL} htmlFor={nameId}>Nome</label>
            <input
              id={nameId}
              style={INPUT}
              spellCheck={false}
              value={customName}
              disabled={busy}
              placeholder="Como chamá-lo — Ollama de casa, gateway da empresa"
              onChange={(event) => { setCustomName(event.target.value) }}
            />
          </div>

          <div style={FIELD}>
            <label style={LABEL} htmlFor={baseId}>Endereço base</label>
            <input
              id={baseId}
              style={INPUT}
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={baseURL}
              disabled={busy}
              placeholder="http://192.168.0.10:11434/v1"
              onChange={(event) => { setBaseURL(event.target.value) }}
            />
          </div>

          <div style={FIELD}>
            <label style={LABEL} htmlFor={keyId}>Chave de API (opcional)</label>
            <input
              id={keyId}
              style={INPUT}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              disabled={busy}
              placeholder="Deixe em branco se o servidor não pedir chave"
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
              placeholder={models.length === 0 ? 'Digite o id do modelo ou busque no endereço' : 'Escolha ou digite o id do modelo'}
              onChange={(event) => { setModel(event.target.value) }}
            />
            <datalist id={listId}>
              {models.map(entry => <option key={entry.id} value={entry.id}>{entry.name ?? entry.id}</option>)}
            </datalist>
          </div>

          <div>
            <button
              type="button"
              style={baseURL.trim() === '' ? { ...SECONDARY, opacity: 0.5 } : SECONDARY}
              disabled={busy || seeking || baseURL.trim() === ''}
              onClick={() => { void seek() }}
            >
              {seeking ? 'Buscando…' : 'Buscar modelos'}
            </button>
            {models.length === 0
              ? null
              : <span style={{ ...CHOICE_HINT, marginLeft: 8 }}>{models.length} modelo(s) neste endereço.</span>}
          </div>
        </>
      )}

      {custom || option === undefined ? null : (
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
        ? <p style={ERROR}>Nenhum provedor de chat vem pronto nesta instalação. Use Personalizado para apontar um endereço seu.</p>
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
          style={incomplete ? { ...PRIMARY, opacity: 0.5 } : PRIMARY}
          disabled={busy || seeking || incomplete}
          onClick={() => { void (custom ? connectCustom() : connect()) }}
        >
          {busy ? 'Testando…' : 'Testar e continuar'}
        </button>
      </div>
      {busy
        ? <p style={NOTE}>{custom
          ? 'Declarando a rota e enviando uma mensagem curta ao modelo.'
          : 'Enviando uma mensagem curta ao modelo para conferir a chave.'}</p>
        : null}
    </>
  )
}
