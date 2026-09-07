import { redirect } from 'next/navigation'
import { getStaffSession } from '@/modules/identity/public'
import { ReceivablesDashboard, type ReceivableDashboardRow } from '@/modules/receivables/ui/receivables-dashboard'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FinanceiroPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('receivables')
    .select('id,source_type,original_amount_cents,status,person:people!receivables_person_id_fkey(civil_name,preferred_name),payer:people!receivables_payer_person_id_fkey(civil_name,preferred_name),payments(amount_cents)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`RECEIVABLES_READ_FAILED:${error.code}`)

  const rows: ReceivableDashboardRow[] = (data ?? []).map((row) => ({
    id: row.id,
    personName: row.person?.preferred_name || row.person?.civil_name || 'Paciente',
    payerName: row.payer?.preferred_name || row.payer?.civil_name || 'Pagador',
    sourceType: row.source_type,
    originalAmountCents: row.original_amount_cents,
    paidCents: (row.payments ?? []).reduce((sum, payment) => sum + payment.amount_cents, 0),
    status: row.status,
  }))

  return <>
    <PageHeader
      title="Financeiro"
      description="Recebíveis, pagamentos e saldo em aberto por paciente e pagador."
    />
    <ReceivablesDashboard rows={rows} />
  </>
}
