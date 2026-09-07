import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createPerson } from '@/modules/people/public'
import type { Person, PersonId } from '@/modules/people/public'
import { recordAuditEvent, type AuditEvent, type AuditEventRepository } from '@/modules/audit/public'
import type { Database } from '@/platform/supabase/types'
import { PageHeader } from '@/shared/ui/page-header'
import { PersonForm, type PersonFormState, type PersonFormValues } from '@/modules/people/ui/person-form'

function valuesFrom(formData: FormData): PersonFormValues {
  return {
    civil_name: String(formData.get('civil_name') ?? ''), preferred_name: String(formData.get('preferred_name') ?? ''),
    birth_date: String(formData.get('birth_date') ?? ''), cpf: String(formData.get('cpf') ?? ''), email: String(formData.get('email') ?? ''), phone: String(formData.get('phone') ?? ''),
    fiscal_street: String(formData.get('fiscal_street') ?? ''), fiscal_number: String(formData.get('fiscal_number') ?? ''), fiscal_district: String(formData.get('fiscal_district') ?? ''), fiscal_city: String(formData.get('fiscal_city') ?? ''), fiscal_state: String(formData.get('fiscal_state') ?? ''), fiscal_postal_code: String(formData.get('fiscal_postal_code') ?? ''),
  }
}

function fiscalAddressFrom(values: PersonFormValues) {
  const address = { street: values.fiscal_street.trim(), number: values.fiscal_number.trim(), district: values.fiscal_district.trim(), city: values.fiscal_city.trim(), state: values.fiscal_state.trim().toUpperCase(), postalCode: values.fiscal_postal_code.replace(/\D/g, '') }
  const addressValues = Object.values(address)
  if (addressValues.every((value) => !value)) return { ok: true as const, address: {} }
  if (!values.cpf.trim()) return { ok: false as const, error: 'Informe o CPF para preparar a pessoa para NFS-e.' }
  if (addressValues.some((value) => !value)) return { ok: false as const, error: 'Preencha todos os campos do endereço fiscal ou deixe todos em branco.' }
  if (!/^[A-Z]{2}$/.test(address.state) || !/^\d{8}$/.test(address.postalCode)) return { ok: false as const, error: 'Confira a UF (2 letras) e o CEP (8 números).' }
  return { ok: true as const, address }
}

function auditRepository(client: Awaited<ReturnType<typeof createServerSupabaseClient>>): AuditEventRepository {
  return {
    async insert(event: AuditEvent): Promise<void> {
      const { error } = await client.from('audit_events').insert({
        actor_user_id: event.actorId,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId,
        correlation_id: event.correlationId,
        metadata: event.metadata as Database['public']['Tables']['audit_events']['Insert']['metadata'],
        created_at: event.createdAt,
      })
      if (error) throw new Error('PERSON_AUDIT_FAILED')
    },
  }
}

async function createPersonAction(previous: PersonFormState, formData: FormData): Promise<PersonFormState> {
  'use server'
  const values = valuesFrom(formData)
  const invalid = (error: string): PersonFormState => ({ revision: previous.revision + 1, error, values })
  const session = await getStaffSession(); const authorized = authorizeStaffSession(session, ['psychologist_owner', 'secretary'])
  const fiscal = fiscalAddressFrom(values); if (!fiscal.ok) return invalid(fiscal.error)
  const client = await createServerSupabaseClient()
  const repository = {
    async findByUniqueFields(input: { cpfNormalized: string | null; emailNormalized: string | null; phoneE164: string | null }) { for (const [column, value] of Object.entries(input)) { if (!value) continue; const { data } = await client.from('people').select('cpf_normalized, email_normalized, phone_e164').eq(column as never, value).maybeSingle(); if (data) return { cpfNormalized: data.cpf_normalized, emailNormalized: data.email_normalized, phoneE164: data.phone_e164 } } return null },
    async insert(input: Omit<Person, 'id'>): Promise<Person> {
      const { data, error } = await client.from('people').insert({ civil_name: input.civilName, preferred_name: input.preferredName, cpf_normalized: input.cpfNormalized, birth_date: input.birthDate, email_normalized: input.emailNormalized, phone_e164: input.phoneE164, preferred_channel: input.preferredChannel, birthday_messages_enabled: input.birthdayMessagesEnabled, fiscal_address: fiscal.address }).select('id, civil_name, preferred_name, cpf_normalized, birth_date, email_normalized, phone_e164, preferred_channel, birthday_messages_enabled').single()
      if (error || !data) throw new Error('PERSON_CREATE_FAILED')
      return { id: data.id as PersonId, civilName: data.civil_name, preferredName: data.preferred_name, cpfNormalized: data.cpf_normalized, birthDate: data.birth_date, emailNormalized: data.email_normalized, phoneE164: data.phone_e164, preferredChannel: data.preferred_channel as Person['preferredChannel'], birthdayMessagesEnabled: data.birthday_messages_enabled }
    },
  }
  try {
    const result = await createPerson(repository, { civilName: values.civil_name, preferredName: values.preferred_name, cpf: values.cpf, birthDate: values.birth_date, email: values.email, phone: values.phone })
    if (!result.ok) return invalid(result.code === 'DUPLICATE_CPF' ? 'Já existe uma pessoa com este CPF.' : 'Já existe uma pessoa com este e-mail ou telefone.')
    await recordAuditEvent({
      actorId: authorized.userId,
      action: 'person.created',
      entityType: 'person',
      entityId: result.person.id,
      correlationId: result.person.id,
      metadata: { fiscalReady: Object.keys(fiscal.address).length > 0 },
    }, auditRepository(client))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CPF') return invalid('Informe um CPF válido.')
    throw error
  }
  redirect('/pessoas')
}

export default function NewPersonPage() {
  return <><PageHeader title="Nova pessoa" description="Cadastre uma pessoa uma única vez para reutilizar em outros fluxos." actions={<Link className="ui-button ui-button--outline" href="/pessoas">Voltar</Link>} /><PersonForm action={createPersonAction} /></>
}
