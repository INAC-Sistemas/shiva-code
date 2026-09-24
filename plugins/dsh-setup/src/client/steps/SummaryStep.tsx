/**
 * Last step: what was configured, and the action that records completion.
 * @module dsh-setup/client/steps/SummaryStep
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { post } from '../api.ts'
import {
  ERROR, FOOTER, NOTE, PRIMARY, SECONDARY, SPACER, SUMMARY_ROW, SUMMARY_VALUE,
} from '../styles.ts'
import { COMPLETE_ROUTE } from '../../wire.ts'
import type { MemoryChoice, OkResult } from '../../wire.ts'

/** One configured tool as the summary lists it. */
export interface SummaryRow {
  label: string
  value: string
}

/** Props of {@link SummaryStep}. */
export interface SummaryStepProps {
  rows: SummaryRow[]
  /** The memory step's outcome, or null when it was not offered. */
  memory: MemoryChoice | null
  /** Called after completion was recorded. */
  onFinish: () => void
  /** Return to the previous step. */
  onBack: () => void
}

/**
 * Render the summary.
 * @param props - the rows, the memory outcome and navigation callbacks.
 * @returns the step body and actions.
 */
export function SummaryStep({ rows, memory, onFinish, onBack }: SummaryStepProps): ReactNode {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const finish = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    const answer: OkResult = await post(COMPLETE_ROUTE, { openviking: memory })
    setBusy(false)
    if (!answer.ok) {
      setError(answer.message)
      return
    }
    onFinish()
  }

  return (
    <>
      {rows.map(row => (
        <div key={row.label} style={SUMMARY_ROW}>
          <span>{row.label}</span>
          <span style={SUMMARY_VALUE}>{row.value}</span>
        </div>
      ))}
      <p style={NOTE}>Tudo fica salvo neste computador. Para mudar depois, use Configurações → Modelos e as abas Assets e Memória.</p>
      {error === undefined ? null : <p style={ERROR}>{error}</p>}
      <div style={FOOTER}>
        <button type="button" style={SECONDARY} disabled={busy} onClick={onBack}>Voltar</button>
        <span style={SPACER} />
        <button type="button" style={PRIMARY} disabled={busy} onClick={() => { void finish() }}>
          {busy ? 'Salvando…' : 'Começar a usar'}
        </button>
      </div>
    </>
  )
}
