import { describe, expect, it } from 'vitest'
import { evaluateTreatment } from './fiscal-treatment'

describe('fiscal treatment', () => {
  it('blocks a no-show charge until treatment is approved', () => {
    expect(evaluateTreatment({ sourceKind: 'appointment_no_show', treatment: null })).toEqual({ ok: false, error: 'FISCAL_TREATMENT_NOT_CONFIGURED' })
  })
})
