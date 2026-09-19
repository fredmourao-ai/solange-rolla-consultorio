import { describe, expect, it } from 'vitest'
import { getCurrentMedicalHistory } from './medical-history'

describe('medical history revisions', () => {
  it('returns the latest non-superseded revision', () => {
    const records = [
      { id: 'v1', personId: 'p1', revision: 1, sourceType: 'clinician_review' as const, createdAt: '2026-01-01T00:00:00Z', plaintext: '{"version":1,"kind":"medical_history","allergies":"A"}' },
      { id: 'v2', personId: 'p1', revision: 2, sourceType: 'clinician_review' as const, supersedesId: 'v1', createdAt: '2026-02-01T00:00:00Z', plaintext: '{"version":1,"kind":"medical_history","allergies":"B"}' },
    ]
    expect(getCurrentMedicalHistory(records)?.id).toBe('v2')
  })
})
