import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { FiscalQueue } from '@/modules/fiscal/ui/fiscal-queue'
import { toFiscalQueueItems } from '@/modules/fiscal/public'
import type { FiscalDocumentStatus } from '@/modules/fiscal/domain/fiscal-document'
import { createServerSupabaseClient } from '@/platform/supabase/server'

export default async function FiscalPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('fiscal_documents')
    .select('id,status,source_type,amount_cents,issued_at,person:people!fiscal_documents_person_id_fkey(civil_name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error('FISCAL_READ_FAILED')

  const items = toFiscalQueueItems((data ?? []).map((row) => ({
    id: row.id,
    status: row.status as FiscalDocumentStatus,
    sourceType: row.source_type,
    amountCents: row.amount_cents,
    personName: row.person?.civil_name ?? 'Pessoa não identificada',
    issuedAt: row.issued_at,
  })))
  const issued = items.filter((item) => item.status === 'issued').length
  const pending = items.filter((item) => ['not_ready', 'ready', 'queued', 'processing'].includes(item.status)).length

  return <>
    <PageHeader title="Fiscal" description="Elegibilidade, revisão e emissão baseadas nos registros fiscais." />
    <div className="fiscal-page-grid">
      <Card>
        <CardTitle>Fila de operação</CardTitle>
        <CardDescription>{items.length} documentos · {pending} pendentes · {issued} emitidos.</CardDescription>
        <FiscalQueue items={items} />
      </Card>
      <Card>
        <CardTitle>Proteção de documentos</CardTitle>
        <CardDescription>
          Arquivos fiscais são privados, versionados e entregues somente por autorização temporária.
        </CardDescription>
      </Card>
    </div>
  </>
}
