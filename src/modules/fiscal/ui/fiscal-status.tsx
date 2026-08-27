import { StatusBadge } from '@/shared/ui/status-badge'
import type { FiscalDocumentStatus } from '../domain/fiscal-document'

type FiscalStatusProps = {
  status: FiscalDocumentStatus
}

const labels: Record<FiscalDocumentStatus, string> = {
  not_ready: 'Tratamento fiscal pendente',
  ready: 'Pronto para revisão',
  queued: 'Aguardando emissão',
  processing: 'Emitindo',
  issued: 'Documento emitido',
  failed_retryable: 'Erro temporário',
  failed_final: 'Erro requer ação',
  cancel_requested: 'Cancelamento solicitado',
  cancelled: 'Documento cancelado',
  replaced: 'Documento substituído',
}

const badgeStatus: Record<FiscalDocumentStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  not_ready: 'warning',
  ready: 'neutral',
  queued: 'neutral',
  processing: 'warning',
  issued: 'success',
  failed_retryable: 'warning',
  failed_final: 'danger',
  cancel_requested: 'warning',
  cancelled: 'neutral',
  replaced: 'neutral',
}

export function FiscalStatus({ status }: FiscalStatusProps) {
  return <StatusBadge status={badgeStatus[status]}>{labels[status]}</StatusBadge>
}
