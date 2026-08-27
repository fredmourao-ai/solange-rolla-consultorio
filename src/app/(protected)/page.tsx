import { PageHeader } from '@/shared/ui/page-header'
import { AttentionDashboard } from '@/modules/reports/ui/attention-dashboard'
import { getAttentionItems, type AttentionInput } from '@/modules/reports/public'

const syntheticDashboardInput: AttentionInput = {
  appointments: [],
  forms: [],
  signatures: [],
  receivables: [],
  payables: [],
  fiscal: [],
  birthdays: [],
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Visão operacional do consultório." />
      <AttentionDashboard items={getAttentionItems(syntheticDashboardInput)} />
    </>
  )
}
