import { describe, expect, it } from 'vitest'
import { buildOperationalReports } from './operational-report-read-model'

describe('buildOperationalReports', () => {
  it('normalizes persisted records into report contracts', () => {
    const result = buildOperationalReports({
      payments: [], refunds: [],
      receivables: [{ amount_cents: 30000, status: 'open' }, { amount_cents: 30000, status: 'overdue' }],
      payables: [],
      appointments: [{ id: 'a1', starts_at: '2026-09-01T17:00:00Z', status: 'pending_confirmation' }],
      events: [{ id: 'e1', title: 'Evento', capacity: 12, registrations: [{ price_cents: 18000, status: 'confirmed', attendance_status: 'unknown' }], expenses: [] }],
      fiscalDocuments: [{ id: 'f1', status: 'issued', amount_cents: 18000 }],
    }, '2026-09-01', '2026-10-01')

    expect(result.financial.projectedCents).toBe(30000)
    expect(result.financial.overdueReceivablesCents).toBe(30000)
    expect(result.appointments.pendingConfirmation).toBe(1)
    expect(result.events[0]).toMatchObject({ registered: 1, potentialRevenueCents: 18000 })
    expect(result.fiscal).toMatchObject({ issued: 1, issuedCents: 18000 })
  })
})
