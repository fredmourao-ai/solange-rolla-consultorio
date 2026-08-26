import { describe, expect, it } from 'vitest'
import { cancellationPolicyCopy } from './policy-copy'

describe('cancellation policy copy', () => {
  it('shows the persisted deadline without recalculating it', () => {
    const copy = cancellationPolicyCopy({ fullText: 'Cancelamentos sem cobrança exigem 48 horas computáveis.', deadline: '2026-08-27T15:00:00.000Z', now: '2026-08-26T15:00:00.000Z' })
    expect(copy.deadlineText).toContain('27/08')
    expect(copy.summary).toContain('cobrança')
  })
})
