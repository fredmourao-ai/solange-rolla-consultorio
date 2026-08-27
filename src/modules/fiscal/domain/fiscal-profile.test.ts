import { describe, expect, it } from 'vitest'
import { validateForLiveIssuance, type FiscalProfile } from './fiscal-profile'

const incompleteProfile = { issuerKind: 'individual', issuerDocument: '', municipalityCode: '', serviceCode: '', taxRegime: '' } as FiscalProfile

describe('fiscal profile', () => {
  it('refuses live issuance with an incomplete profile', () => {
    expect(validateForLiveIssuance(incompleteProfile)).toEqual({ ok: false, error: 'FISCAL_PROFILE_INCOMPLETE' })
  })

  it('refuses an inactive profile even when its fields are complete', () => {
    expect(validateForLiveIssuance({
      version: 1,
      issuerKind: 'individual',
      issuerDocument: '12345678901',
      municipalityCode: '3550308',
      serviceCode: '1.01',
      taxRegime: 'normal',
      effectiveFrom: '2026-01-01T00:00:00Z',
      effectiveUntil: '2026-02-01T00:00:00Z',
      active: false,
    })).toEqual({ ok: false, error: 'FISCAL_PROFILE_INCOMPLETE' })
  })
})
