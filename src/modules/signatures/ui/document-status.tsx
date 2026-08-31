import type { SignedDocumentStatus } from '../application/get-signed-document'

const labels: Record<Exclude<SignedDocumentStatus, 'ready'>, string> = {
  pending: 'Documento assinado aguardando geração',
  processing: 'Gerando documento assinado',
  failed_retryable: 'Geração temporariamente indisponível. Tente novamente em instantes.',
  failed_final: 'Não foi possível gerar o documento assinado.',
}

export function DocumentStatus({
  status,
  downloadUrl,
}: {
  status: SignedDocumentStatus
  downloadUrl?: string
}) {
  if (status === 'ready') {
    return (
      <div className="document-status" role="status">
        <p>Documento assinado pronto</p>
        {downloadUrl ? <a href={downloadUrl}>Baixar PDF</a> : null}
      </div>
    )
  }

  return <p className="document-status" role="status">{labels[status]}</p>
}
