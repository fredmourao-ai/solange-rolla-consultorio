import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStaffSession } from '@/modules/identity/public'
import { PersonResults, type PersonResult } from '@/modules/people/ui/person-results'
import { PersonSearch } from '@/modules/people/ui/person-search'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function safeSearchTerm(value?: string): string {
  return (value ?? '').trim().slice(0, 100).replace(/[,%()]/g, ' ')
}

export default async function PeoplePage({ searchParams }: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const term = safeSearchTerm(q)
  const session = await getStaffSession()
  if (!session) redirect('/login')
  const supabase = await createServerSupabaseClient()
  const canAccessClinical = Boolean(session?.active && session.role === 'psychologist_owner' && session.aal === 'aal2')
  let request = supabase.from('people')
    .select('id,civil_name,preferred_name,email_normalized,phone_e164')
    .order('civil_name', { ascending: true })
    .limit(20)
  if (term) request = request.or(`civil_name.ilike.%${term}%,preferred_name.ilike.%${term}%,email_normalized.ilike.%${term}%,phone_e164.ilike.%${term}%`)
  const { data, error } = await request
  if (error) throw new Error(`PEOPLE_SEARCH_FAILED:${error.code}`)
  const people: PersonResult[] = (data ?? []).map((person) => ({
    id: person.id,
    civilName: person.civil_name,
    preferredName: person.preferred_name,
    email: person.email_normalized,
    phone: person.phone_e164,
  }))

  return <>
    <PageHeader
      title="Pessoas"
      description="Cadastro único de pacientes, participantes e responsáveis."
      actions={<Link className="ui-button ui-button--primary" href="/pessoas/nova">Nova pessoa</Link>}
    />
    <PersonSearch />
    <PersonResults people={people} canAccessClinical={canAccessClinical} />
  </>
}
