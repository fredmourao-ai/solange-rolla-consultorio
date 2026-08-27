import { describe, expect, it } from 'vitest'
import { evaluateFiscalReadiness } from './evaluate-fiscal-readiness'
import type { FiscalProfile } from '../domain/fiscal-profile'
import type { FiscalTreatment } from '../domain/fiscal-treatment'

const profile: FiscalProfile = {
  version: 1,
  issuerKind: 'individual',
  issuerDocument: '12345678901',
  municipalityCode: '3550308',
  serviceCode: '1.01',
  taxRegime: 'normal',
  effectiveFrom: '2026-01-01T00:00:00Z',
}

const treatment: FiscalTreatment = {
  sourceKind: 'appointment_completed',
  version: 1,
  issuanceRule: 'service_completed',
  enabledForLive: true,
  effectiveFrom: '2026-01-01T00:00:00Z',
  approved: true,
}

describe('fiscal readiness', () => {
  it('reports every missing fiscal prerequisite without exposing party data', () => {
    expect(evaluateFiscalReadiness({
      sourceKind: 'appointment_completed',
      amountCents: 0,
      profile: null,
      treatment: null,
      payer: null,
    })).toEqual({
      status: 'not_ready',
      blockers: [
        'FISCAL_PROFILE_INCOMPLETE',
        'FISCAL_TREATMENT_NOT_CONFIGURED',
        'FISCAL_PAYER_NOT_CONFIGURED',
        'FISCAL_AMOUNT_INVALID',
        'FISCAL_SERVICE_CODE_MISSING',
      ],
    })
  })

  it('keeps no-show in review even when its treatment is approved', () => {
    expect(evaluateFiscalReadiness({
      sourceKind: 'appointment_no_show',
      amountCents: 15000,
      profile,
      treatment: { ...treatment, sourceKind: 'appointment_no_show', issuanceRule: 'manual_review' },
      payer: { document: '12345678901', address: { city: 'Sao Paulo' } },
    })).toEqual({
      status: 'review',
      blockers: ['FISCAL_TREATMENT_REQUIRES_REVIEW'],
    })
  })
})
