import Link from 'next/link'
import { PageHeader } from '@/shared/ui/page-header'
import { PersonSearch } from '@/modules/people/ui/person-search'

export default function PeoplePage() {
  return <>
    <PageHeader title="Pessoas" description="Cadastro único de pacientes, participantes e responsáveis." actions={<Link className="ui-button ui-button--primary" href="/pessoas/nova">Nova pessoa</Link>} />
    <PersonSearch />
    <p className="empty-state">Nenhuma busca realizada.</p>
  </>
}
