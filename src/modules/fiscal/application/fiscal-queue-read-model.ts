import type { FiscalDocumentStatus } from '../domain/fiscal-document'
import type { FiscalQueueItem } from '../ui/fiscal-queue'

export type FiscalQueueRecord = {
  id: string
  status: FiscalDocumentStatus
  sourceType: string
  amountCents: number
  personName: string
  issuedAt?: string | null
}

const sourceLabels: Record<string, string> = {
  appointment_completed: 'Consulta concluída',
  appointment_late_cancellation: 'Cancelamento tardio',
  appointment_no_show: 'Falta à consulta',
  event_registration: 'Inscrição em evento',
  other_service: 'Outro serviço',
}
const statusLabels: Partial<Record<FiscalDocumentStatus, string>> = {
  issued: 'Emitido', ready: 'Pronto para revisão', not_ready: 'Aguardando elegibilidade',
  failed_retryable: 'Falha recuperável', failed_final: 'Falha final', cancelled: 'Cancelado',
}
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function toFiscalQueueItems(records: FiscalQueueRecord[]): FiscalQueueItem[] {
  return records.map((record) => ({
    id: record.id,
    status: record.status,
    sourceLabel: sourceLabels[record.sourceType] ?? 'Documento fiscal',
    detail: `${record.personName} · ${money.format(record.amountCents / 100)} · ${statusLabels[record.status] ?? record.status}`,
  }))
}
