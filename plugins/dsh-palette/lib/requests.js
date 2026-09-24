// dsh-palette request state: the one open palette question and the tool call
// waiting on it. Dependency-free so it is testable without a harness.

/**
 * One palette request at a time: the model asks, the person answers.
 * `settle` resolves the waiting tool call.
 */
export class PaletteRequests {
  seq = 0
  current = null

  /**
   * Open a request and wait for the person's answer.
   * @param question - what the model asks, shown above the picker.
   * @param suggestions - palettes the model proposes, shown first.
   * @param signal - the tool call's cancellation.
   * @returns the confirmed selection, or `{ cancelled: true }`.
   */
  open(question, suggestions, signal) {
    if (this.current !== null) throw new Error('já existe um pedido de paleta aberto; espere a resposta do usuário')
    this.seq += 1
    const id = `palette-${this.seq}`
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        if (this.current?.id === id) this.current = null
        reject(signal.reason ?? new Error('cancelado'))
      }
      if (signal?.aborted) return onAbort()
      signal?.addEventListener('abort', onAbort, { once: true })
      this.current = {
        id,
        question,
        suggestions,
        createdAt: Date.now(),
        settle: (value) => {
          signal?.removeEventListener('abort', onAbort)
          if (this.current?.id === id) this.current = null
          resolve(value)
        },
      }
    })
  }

  /** The open request as the tab sees it, or null. */
  pending() {
    if (this.current === null) return null
    const { id, question, suggestions, createdAt } = this.current
    return { id, question, suggestions, createdAt }
  }

  /**
   * Resolve the open request.
   * @param id - the request the tab answered.
   * @param value - the validated selection, or `{ cancelled: true }`.
   * @returns false when no request with that id is open.
   */
  answer(id, value) {
    if (this.current === null || this.current.id !== id) return false
    this.current.settle(value)
    return true
  }
}
