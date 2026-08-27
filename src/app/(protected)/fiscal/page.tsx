import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { FiscalQueue, type FiscalQueueItem } from '@/modules/fiscal/ui/fiscal-queue'

const fiscalItems: FiscalQueueItem[] = [
  {
    id: 'fiscal-review-1',
    status: 'ready',
    sourceLabel: 'Serviço concluído',
    detail: 'Serviço elegível aguardando revisão administrativa.',
  },
  {
    id: 'fiscal-review-2',
    status: 'not_ready',
    sourceLabel: 'Falta ou cancelamento',
    detail: 'Falta ou cancelamento aguardando validação antes de qualquer emissão.',
  },
  {
    id: 'fiscal-issued-1',
    status: 'issued',
    sourceLabel: 'Documento fiscal',
    detail: 'Documento disponível em armazenamento privado autorizado.',
  },
]

export default function FiscalPage() {
  return (
    <>
      <PageHeader
        title="Fiscal"
        description="Acompanhe elegibilidade, revisão, emissão e falhas fiscais."
      />
      <div className="fiscal-page-grid">
        <Card>
          <CardTitle>Fila de operação</CardTitle>
          <CardDescription>Itens que exigem revisão ou processamento fiscal.</CardDescription>
          <FiscalQueue items={fiscalItems} />
        </Card>
        <Card>
          <CardTitle>Proteção de documentos</CardTitle>
          <CardDescription>
            Arquivos fiscais são privados, versionados e entregues somente por autorização temporária.
          </CardDescription>
        </Card>
      </div>
    </>
  )
}
