export type AttentionItemKind =
  | 'appointment_confirmation'
  | 'form_pending'
  | 'signature_pending'
  | 'receivable_overdue'
  | 'payable_due'
  | 'fiscal_pending'
  | 'reschedule_requested'
  | 'birthday'

export type AttentionSeverity = 'critical' | 'high' | 'normal'

export type AttentionItem = {
  kind: AttentionItemKind
  severity: AttentionSeverity
  entityId: string
  title: string
  dueAt?: string
  actionHref: string
}

type AttentionSource = { id: string; title: string; actionHref: string; dueAt?: string }

export type AttentionInput = {
  appointments: Array<AttentionSource & { status: 'pending_confirmation' | 'confirmed' | 'reschedule_requested' | 'cancelled' }>
  forms: AttentionSource[]
  signatures: AttentionSource[]
  receivables: Array<AttentionSource & { status: 'open' | 'overdue' | 'paid' }>
  payables: Array<AttentionSource & { dueAt: string }>
  fiscal: Array<AttentionSource & { status: 'not_ready' | 'ready' | 'issued' | 'failed_retryable' | 'failed_final' | 'cancelled' }>
  birthdays: AttentionSource[]
}

const severityRank: Record<AttentionSeverity, number> = { critical: 0, high: 1, normal: 2 }
const kindRank: Record<AttentionItemKind, number> = {
  fiscal_pending: 0,
  receivable_overdue: 1,
  reschedule_requested: 2,
  appointment_confirmation: 3,
  payable_due: 4,
  form_pending: 5,
  signature_pending: 6,
  birthday: 7,
}

function item(kind: AttentionItemKind, severity: AttentionSeverity, source: AttentionSource): AttentionItem {
  return { kind, severity, entityId: source.id, title: source.title, ...(source.dueAt ? { dueAt: source.dueAt } : {}), actionHref: source.actionHref }
}

export function getAttentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = []

  input.appointments.forEach((appointment) => {
    if (appointment.status === 'pending_confirmation') items.push(item('appointment_confirmation', 'high', appointment))
    if (appointment.status === 'reschedule_requested') items.push(item('reschedule_requested', 'high', appointment))
  })
  input.forms.forEach((form) => items.push(item('form_pending', 'normal', form)))
  input.signatures.forEach((signature) => items.push(item('signature_pending', 'normal', signature)))
  input.receivables.forEach((receivable) => {
    if (receivable.status === 'overdue') items.push(item('receivable_overdue', 'high', receivable))
  })
  input.payables.forEach((payable) => items.push(item('payable_due', 'high', payable)))
  input.fiscal.forEach((document) => {
    if (document.status === 'not_ready' || document.status === 'failed_retryable' || document.status === 'failed_final') items.push(item('fiscal_pending', 'critical', document))
  })
  input.birthdays.forEach((birthday) => items.push(item('birthday', 'normal', birthday)))

  return items.sort((left, right) => {
    const severityDifference = severityRank[left.severity] - severityRank[right.severity]
    if (severityDifference !== 0) return severityDifference
    const kindDifference = kindRank[left.kind] - kindRank[right.kind]
    if (kindDifference !== 0) return kindDifference
    return (left.dueAt ?? '').localeCompare(right.dueAt ?? '')
  })
}
