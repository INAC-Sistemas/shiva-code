/**
 * The wizard: a full-frame screen that covers the app until every tool that
 * needs a model is configured.
 *
 * It renders `null` while nobody is signed in (the login gate covers the app),
 * while the facts are being read, and once {@link planSetup} says nothing is
 * missing — the overlay seat is a list, so an entry that renders nothing costs
 * the app nothing. When this plugin's own routes cannot answer, it also renders
 * `null`: a broken wizard must not lock the person out of an app they may
 * already have configured by hand.
 *
 * Which steps exist is decided when the wizard opens. A step is offered only
 * when its plugin answers its status route, so a profile without
 * `dsh-openviking` never shows the memory step.
 * @module dsh-setup/client/SetupGate
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ASSETS_STATUS, MEMORY_STATUS, pluginStatus, post } from './api.ts'
import type { AssetsStatus, MemoryStatus } from './api.ts'
import type { LoginSessionFace } from './context-types.ts'
import { ChatStep } from './steps/ChatStep.tsx'
import { ImageStep } from './steps/ImageStep.tsx'
import { MemoryStep } from './steps/MemoryStep.tsx'
import { SummaryStep } from './steps/SummaryStep.tsx'
import type { SummaryRow } from './steps/SummaryStep.tsx'
import {
  BACKDROP, CARD, EYEBROW, PROGRESS, SEGMENT, SEGMENT_DONE, SUBTITLE, TITLE,
} from './styles.ts'
import { planSetup } from '../plan.ts'
import type { StepId } from '../plan.ts'
import { STATE_ROUTE } from '../wire.ts'
import type { MemoryChoice, SetupState } from '../wire.ts'

/** Props of {@link SetupGate}. */
export interface SetupGateProps {
  /** The read face of `ctx.loginSession`. */
  session: LoginSessionFace
}

/** Heading and lead text of each step. */
const STEP_COPY: Record<StepId, { title: string, subtitle: string }> = {
  chat: {
    title: 'Modelo do chat',
    subtitle: 'Escolha o provedor e o modelo que conversam com você e executam as tarefas.',
  },
  image: {
    title: 'Gerador de imagem',
    subtitle: 'Escolha o provedor e o modelo que o agente usa para gerar imagens.',
  },
  memory: {
    title: 'Memória (OpenViking)',
    subtitle: 'Configure os modelos da memória de longo prazo do agente, ou pule este passo.',
  },
  summary: {
    title: 'Tudo pronto',
    subtitle: 'Confira o que foi configurado.',
  },
}

/** Everything read when the wizard opens. */
interface Facts {
  state: SetupState
  assets: AssetsStatus | null
  memory: MemoryStatus | null
}

/** What each finished step recorded, for the summary. */
interface Results {
  chat?: string
  image?: string
  memory?: { choice: MemoryChoice, label: string }
}

/**
 * Read every fact the plan needs.
 * @param signal - aborts the reads.
 * @returns the facts, or undefined when this plugin's own state route failed.
 */
async function readFacts(signal?: AbortSignal): Promise<Facts | undefined> {
  const [state, assets, memory] = await Promise.all([
    post<SetupState>(STATE_ROUTE, {}, signal),
    pluginStatus<AssetsStatus>(ASSETS_STATUS, signal),
    pluginStatus<MemoryStatus>(MEMORY_STATUS, signal),
  ])
  return state.ok ? { state, assets, memory } : undefined
}

/**
 * The wizard.
 * @param props - the login session face.
 * @returns the cover, or null when nothing needs configuring.
 */
export function SetupGate({ session }: SetupGateProps): ReactNode {
  const signedIn = useSyncExternalStore(
    useCallback(listener => session.subscribe(listener), [session]),
    useCallback(() => session.getSnapshot() !== null, [session]),
    useCallback(() => false, []),
  )
  const [facts, setFacts] = useState<Facts | undefined>(undefined)
  const [steps, setSteps] = useState<StepId[]>([])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Results>({})

  useEffect(() => {
    setFacts(undefined)
    setSteps([])
    if (!signedIn) return
    const controller = new AbortController()
    void readFacts(controller.signal).then((read) => {
      if (controller.signal.aborted || read === undefined) return
      const plan = planSetup({
        chatReady: read.state.chat.ready,
        image: {
          available: read.assets !== null,
          configured: read.assets !== null
            && read.assets.settings.imageModel !== ''
            && read.state.imageKeys[read.assets.settings.provider === 'fal' ? 'fal' : 'openrouter'],
        },
        memory: { available: read.memory !== null },
        marker: read.state.marker,
      })
      setFacts(read)
      setSteps(plan.steps)
      setIndex(0)
      setResults({})
    })
    return () => controller.abort()
  }, [signedIn])

  /** Re-read the host state after a step stored something, keeping the step list. */
  const refresh = useCallback(async () => {
    const read = await readFacts()
    if (read !== undefined) setFacts(read)
  }, [])

  const advance = useCallback((record: Results) => {
    setResults(current => ({ ...current, ...record }))
    setIndex(current => current + 1)
    void refresh()
  }, [refresh])
  const back = useCallback(() => { setIndex(current => Math.max(0, current - 1)) }, [])

  const step = steps[index]
  if (!signedIn || facts === undefined || step === undefined) return null

  const rows: SummaryRow[] = [
    { label: 'Chat', value: results.chat ?? '—' },
    ...(steps.includes('image') ? [{ label: 'Imagem', value: results.image ?? '—' }] : []),
    ...(steps.includes('memory') ? [{ label: 'Memória', value: results.memory?.label ?? '—' }] : []),
  ]
  const copy = STEP_COPY[step]

  return (
    <div style={BACKDROP} data-dsh-setup="wizard">
      <div style={CARD} role="dialog" aria-modal="true" aria-labelledby="dsh-setup-title">
        <div style={PROGRESS} aria-hidden="true">
          {steps.map((id, position) => <span key={id} style={position <= index ? SEGMENT_DONE : SEGMENT} />)}
        </div>
        <p style={EYEBROW}>Configuração inicial · Passo {index + 1} de {steps.length}</p>
        <h1 id="dsh-setup-title" style={TITLE}>{copy.title}</h1>
        <p style={SUBTITLE}>{copy.subtitle}</p>

        {step === 'chat' ? (
          <ChatStep key="chat" chat={facts.state.chat} onDone={(label) => { advance({ chat: label }) }} />
        ) : null}
        {step === 'image' && facts.assets !== null ? (
          <ImageStep
            key="image"
            assets={facts.assets}
            keys={facts.state.imageKeys}
            onDone={(label) => { advance({ image: label }) }}
            onBack={back}
          />
        ) : null}
        {step === 'memory' && facts.memory !== null ? (
          <MemoryStep
            key="memory"
            status={facts.memory}
            openrouterKey={facts.state.imageKeys.openrouter}
            onDone={(choice, label) => { advance({ memory: { choice, label } }) }}
            onBack={back}
          />
        ) : null}
        {step === 'summary' ? (
          <SummaryStep
            key="summary"
            rows={rows}
            memory={steps.includes('memory') ? results.memory?.choice ?? 'skipped' : null}
            onFinish={() => { setSteps([]) }}
            onBack={back}
          />
        ) : null}
      </div>
    </div>
  )
}
