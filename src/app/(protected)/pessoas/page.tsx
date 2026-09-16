import Link from 'next/link'
import { redirect } from 'next/navigation'
import { authorizeStaffPermission, getStaffSession, hasSessionPermission } from '@/modules/identity/public'
import { buildPeopleSearchFilters } from '@/modules/people/application/search-people'
import { PersonResults, type PersonResult } from '@/modules/people/ui/person-results'
import { PersonSearch } from '@/modules/people/ui/person-search'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 20

function safeSearchTerm(value?: string): string {
  return (value ?? '').trim().slice(0, 100).replace(/[,%()]/g, ' ')
}

function pageNumber(value?: string) {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

function pageHref(page: number, term: string) {
  const params = new URLSearchParams()
  if (term) params.set('q', term)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/pessoas${query ? `?${query}` : ''}`
}

export default async function PeoplePage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page: rawPage } = await searchParams
  const term = safeSearchTerm(q)
  const page = pageNumber(rawPage)
  const session = await getStaffSession()
  if (!session) redirect('/login')
  authorizeStaffPermission(session, 'patients.read')

  const supabase = await createServerSupabaseClient()
  const canAccessClinical = hasSessionPermission(session, 'clinical.read') && session.aal === 'aal2'
  const canCreate = hasSessionPermission(session, 'patients.create')
  const canCreateAppointments = hasSessionPermission(session, 'appointments.create')

  let request = supabase.from('people')
    .select('id,civil_name,preferred_name,cpf_normalized,email_normalized,phone_e164', { count: 'exact' })
    .order('civil_name', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (term) {
    request = request.or(buildPeopleSearchFilters(term).join(','))
  }

  const { data, error, count } = await request
  if (error) throw new Error('PATIENT_SEARCH_FAILED')
  const people: PersonResult[] = (data ?? []).map((person) => ({
    id: person.id,
    civilName: person.civil_name,
    preferredName: person.preferred_name,
    cpf: person.cpf_normalized,
    email: person.email_normalized,
    phone: person.phone_e164,
  }))
  const total = count ?? people.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <>
    <PageHeader
      title="Pacientes"
      description="Encontre rapidamente o paciente e acesse cadastro, consultas, documentos e demais rotinas autorizadas."
      actions={canCreate ? <Link className="ui-button ui-button--primary" href="/pessoas/nova">Novo paciente</Link> : undefined}
    />
    <PersonSearch defaultValue={term} />
    <PersonResults
      people={people}
      canAccessClinical={canAccessClinical}
      canCreateAppointments={canCreateAppointments}
    />
    {pageCount > 1 ? <nav className="pagination" aria-label="Paginação de pacientes">
      {page > 1 ? <Link className="ui-button ui-button--outline" href={pageHref(page - 1, term)}>Anterior</Link> : <span />}
      <span>Página {Math.min(page, pageCount)} de {pageCount}</span>
      {page < pageCount ? <Link className="ui-button ui-button--outline" href={pageHref(page + 1, term)}>Próxima</Link> : <span />}
    </nav> : null}
  </>
}
