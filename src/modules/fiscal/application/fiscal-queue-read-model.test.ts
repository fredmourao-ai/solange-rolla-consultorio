import { describe, expect, it } from 'vitest'
import { toFiscalQueueItems } from './fiscal-queue-read-model'

describe('toFiscalQueueItems', () => {
  it('maps persisted fiscal documents to operational queue items', () => {
    const items = toFiscalQueueItems([{
      id: 'doc-1', status: 'issued', sourceType: 'event_registration',
      amountCents: 18000, personName: 'Ana Demonstração', issuedAt: '2026-08-29T15:00:00Z',
    }])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'doc-1', status: 'issued', sourceLabel: 'Inscrição em evento' })
    expect(items[0].detail).toContain('Ana Demonstração')
    expect(items[0].detail).toContain('R$ 180,00')
    expect(items[0].detail).toContain('Emitido')
  })
})
