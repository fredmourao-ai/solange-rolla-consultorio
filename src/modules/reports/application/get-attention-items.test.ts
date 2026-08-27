import { describe, expect, it } from 'vitest'
import { getAttentionItems, type AttentionInput } from './get-attention-items'

const fixture: AttentionInput = {
  appointments: [
    { id: 'appointment-1', status: 'pending_confirmation', title: 'Consulta sem confirmação', actionHref: '/agenda/appointment-1' },
    { id: 'appointment-2', status: 'reschedule_requested', title: 'Reagendamento solicitado', actionHref: '/agenda/appointment-2' },
  ],
  forms: [{ id: 'form-1', title: 'Formulário pendente', actionHref: '/formularios/form-1' }],
  signatures: [{ id: 'signature-1', title: 'Assinatura pendente', actionHref: '/assinaturas/signature-1' }],
  receivables: [{ id: 'receivable-1', status: 'overdue', title: 'Recebível vencido', actionHref: '/financeiro/receivable-1' }],
  payables: [{ id: 'payable-1', dueAt: '2026-09-15', title: 'Despesa vencendo', actionHref: '/financeiro/payable-1' }],
  fiscal: [{ id: 'fiscal-1', status: 'not_ready', title: 'NFS-e pendente', actionHref: '/fiscal/fiscal-1' }],
  birthdays: [{ id: 'person-1', title: 'Aniversário de hoje', actionHref: '/pessoas/person-1' }],
}

describe('daily attention read model', () => {
  it('aggregates operational items without clinical content', () => {
    const items = getAttentionItems(fixture)

    expect(items.map((item) => item.kind)).toEqual([
      'fiscal_pending',
      'receivable_overdue',
      'reschedule_requested',
      'appointment_confirmation',
      'payable_due',
      'form_pending',
      'signature_pending',
      'birthday',
    ])
    expect(items.every((item) => !('clinical' in item))).toBe(true)
    expect(items.find((item) => item.kind === 'fiscal_pending')).toMatchObject({ severity: 'critical', entityId: 'fiscal-1' })
    expect(items.find((item) => item.kind === 'receivable_overdue')).toMatchObject({ severity: 'high', entityId: 'receivable-1' })
  })

  it('ignores resolved records and keeps due dates for action ordering', () => {
    const items = getAttentionItems({
      appointments: [{ id: 'confirmed', status: 'confirmed', title: 'Confirmada', actionHref: '/agenda/confirmed' }],
      forms: [], signatures: [], receivables: [],
      payables: [
        { id: 'later', dueAt: '2026-09-20', title: 'Mais tarde', actionHref: '/financeiro/later' },
        { id: 'soon', dueAt: '2026-09-05', title: 'Mais cedo', actionHref: '/financeiro/soon' },
      ],
      fiscal: [{ id: 'issued', status: 'issued', title: 'Emitida', actionHref: '/fiscal/issued' }],
      birthdays: [],
    })

    expect(items.map((item) => item.entityId)).toEqual(['soon', 'later'])
    expect(items[0]?.dueAt).toBe('2026-09-05')
  })
})
