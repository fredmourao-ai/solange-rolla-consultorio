import { describe, expect, it } from 'vitest'
import { validateForLiveIssuance, type FiscalProfile } from './fiscal-profile'

const incompleteProfile = { issuerKind: 'individual', issuerDocument: '', municipalityCode: '', serviceCode: '', taxRegime: '' } as FiscalProfile

describe('fiscal profile', () => {
  it('refuses live issuance with an incomplete profile', () => {
    expect(validateForLiveIssuance(incompleteProfile)).toEqual({ ok: false, error: 'FISCAL_PROFILE_INCOMPLETE' })
  })
})
