import { MfaPanel } from '@/modules/identity/ui/mfa-panel'
import { PageHeader } from '@/shared/ui/page-header'

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ reason?: string; returnTo?: string }> }) {
  const { reason, returnTo } = await searchParams
  const description = reason === 'mfa_required'
    ? 'Confirme a autenticação em duas etapas para acessar informações clínicas.'
    : 'Gerencie a autenticação em duas etapas exigida para o módulo clínico.'

  return <>
    <PageHeader title="Segurança da conta" description={description} />
    <MfaPanel returnTo={returnTo} />
  </>
}
