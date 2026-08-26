import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createPerson } from '@/modules/people/public'
import type { Person, PersonId } from '@/modules/people/public'
import { PageHeader } from '@/shared/ui/page-header'
import { PersonForm } from '@/modules/people/ui/person-form'

async function createPersonAction(formData: FormData) {
  'use server'

  const session = await getStaffSession()
  authorizeStaffSession(session, ['psychologist_owner', 'secretary'])
  const client = await createServerSupabaseClient()
  const repository = {
    async findByUniqueFields(input: { cpfNormalized: string | null; emailNormalized: string | null; phoneE164: string | null }) {
      for (const [column, value] of Object.entries(input)) {
        if (!value) continue
        const { data } = await client.from('people').select('cpf_normalized, email_normalized, phone_e164').eq(column as never, value).maybeSingle()
        if (data) return { cpfNormalized: data.cpf_normalized, emailNormalized: data.email_normalized, phoneE164: data.phone_e164 }
      }
      return null
    },
    async insert(input: Omit<Person, 'id'>): Promise<Person> {
      const { data, error } = await client.from('people').insert({
        civil_name: input.civilName,
        preferred_name: input.preferredName,
        cpf_normalized: input.cpfNormalized,
        birth_date: input.birthDate,
        email_normalized: input.emailNormalized,
        phone_e164: input.phoneE164,
        preferred_channel: input.preferredChannel,
        birthday_messages_enabled: input.birthdayMessagesEnabled,
        fiscal_address: {},
      }).select('id, civil_name, preferred_name, cpf_normalized, birth_date, email_normalized, phone_e164, preferred_channel, birthday_messages_enabled').single()
      if (error || !data) throw new Error('PERSON_CREATE_FAILED')
      return {
        id: data.id as PersonId,
        civilName: data.civil_name,
        preferredName: data.preferred_name,
        cpfNormalized: data.cpf_normalized,
        birthDate: data.birth_date,
        emailNormalized: data.email_normalized,
        phoneE164: data.phone_e164,
        preferredChannel: data.preferred_channel as Person['preferredChannel'],
        birthdayMessagesEnabled: data.birthday_messages_enabled,
      }
    },
  }
  const result = await createPerson(repository, {
    civilName: String(formData.get('civil_name') ?? ''),
    preferredName: String(formData.get('preferred_name') ?? ''),
    cpf: String(formData.get('cpf') ?? ''),
    birthDate: String(formData.get('birth_date') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  })
  if (!result.ok) throw new Error(result.code)
  redirect('/pessoas')
}

export default function NewPersonPage() {
  return <>
    <PageHeader title="Nova pessoa" description="Cadastre uma pessoa uma única vez para reutilizar em outros fluxos." actions={<Link className="ui-button ui-button--outline" href="/pessoas">Voltar</Link>} />
    <PersonForm action={createPersonAction} />
  </>
}
