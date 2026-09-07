import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const channels = ['whatsapp', 'email', 'phone', 'none'] as const
const relationshipKinds = ['legal_guardian', 'financial_responsible', 'fiscal_taker'] as const

type RelationshipKind = typeof relationshipKinds[number]

function isRelationshipKind(value: string): value is RelationshipKind {
  return relationshipKinds.includes(value as RelationshipKind)
}

async function authorizedClient() {
  const session = await getStaffSession()
  authorizeStaffSession(session, ['psychologist_owner', 'secretary'])
  return createServerSupabaseClient()
}

async function savePreferencesAction(formData: FormData) {
  'use server'
  const client = await authorizedClient()
  const personId = String(formData.get('person_id') ?? '')
  const channel = String(formData.get('preferred_channel') ?? '')
  if (!personId || !channels.includes(channel as typeof channels[number])) throw new Error('PERSON_PREFERENCES_INVALID')
  const { error } = await client.from('people').update({
    preferred_channel: channel,
    birthday_messages_enabled: formData.get('birthday_messages_enabled') === 'on',
  }).eq('id', personId)
  if (error) throw new Error(`PERSON_PREFERENCES_UPDATE_FAILED:${error.code}`)
  redirect(`/pessoas/${personId}/gerenciar?saved=preferences`)
}

async function addRelationshipAction(formData: FormData) {
  'use server'
  const client = await authorizedClient()
  const personId = String(formData.get('person_id') ?? '')
  const relatedPersonId = String(formData.get('related_person_id') ?? '')
  const kind = String(formData.get('relationship_kind') ?? '')
  if (!personId || !relatedPersonId || personId === relatedPersonId || !isRelationshipKind(kind)) {
    throw new Error('PERSON_RELATIONSHIP_INVALID')
  }
  const { error } = await client.from('person_relationships').insert({
    person_id: personId,
    related_person_id: relatedPersonId,
    relationship_kind: kind,
  })
  if (error && error.code !== '23505') throw new Error(`PERSON_RELATIONSHIP_CREATE_FAILED:${error.code}`)
  redirect(`/pessoas/${personId}/gerenciar?saved=relationship`)
}

const relationshipLabels: Record<RelationshipKind, string> = {
  legal_guardian: 'Responsável legal',
  financial_responsible: 'Responsável financeiro',
  fiscal_taker: 'Tomador fiscal',
}
export default async function ManagePersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params
  const client = await authorizedClient()
  const [{ data: person, error: personError }, { data: people, error: peopleError }, { data: relationships, error: relationshipsError }] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_channel,birthday_messages_enabled').eq('id', personId).maybeSingle(),
    client.from('people').select('id,civil_name').neq('id', personId).order('civil_name', { ascending: true }).limit(500),
    client.from('person_relationships').select('id,related_person_id,relationship_kind').eq('person_id', personId).order('created_at', { ascending: true }),
  ])
  if (personError || !person) notFound()
  if (peopleError) throw new Error(`PEOPLE_RELATIONSHIP_OPTIONS_FAILED:${peopleError.code}`)
  if (relationshipsError) throw new Error(`PEOPLE_RELATIONSHIPS_READ_FAILED:${relationshipsError.code}`)
  const nameById = new Map((people ?? []).map((candidate) => [candidate.id, candidate.civil_name]))

  return <>
    <PageHeader
      title={`Gerenciar ${person.civil_name}`}
      description="Preferências de comunicação e vínculos administrativos da pessoa."
      actions={<Link className="ui-button ui-button--outline" href="/pessoas">Voltar</Link>}
    />
    <section className="ui-card" aria-labelledby="communication-preferences-title">
      <h2 id="communication-preferences-title" className="ui-card__title">Preferências de comunicação</h2>
      <form action={savePreferencesAction}>
        <input type="hidden" name="person_id" value={person.id} />
        <label className="form-field"><span className="form-field__label">Canal preferido</span><select className="ui-select" name="preferred_channel" defaultValue={person.preferred_channel}>{channels.map((channel) => <option key={channel} value={channel}>{channel === 'none' ? 'Nenhum' : channel}</option>)}</select></label>
        <label className="form-field form-field--checkbox"><input type="checkbox" name="birthday_messages_enabled" defaultChecked={person.birthday_messages_enabled} /><span>Enviar mensagem de aniversário</span></label>
        <button className="ui-button ui-button--primary" type="submit">Salvar preferências</button>
      </form>
    </section>
    <section className="ui-card" aria-labelledby="relationships-title">
      <h2 id="relationships-title" className="ui-card__title">Vínculos administrativos</h2>
      <form action={addRelationshipAction}>
        <input type="hidden" name="person_id" value={person.id} />
        <label className="form-field"><span className="form-field__label">Tipo de vínculo</span><select className="ui-select" name="relationship_kind" defaultValue="financial_responsible">{relationshipKinds.map((kind) => <option key={kind} value={kind}>{relationshipLabels[kind]}</option>)}</select></label>
        <label className="form-field"><span className="form-field__label">Pessoa relacionada</span><select className="ui-select" name="related_person_id" required defaultValue=""><option value="" disabled>Selecione</option>{(people ?? []).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.civil_name}</option>)}</select></label>
        <button className="ui-button ui-button--primary" type="submit">Adicionar vínculo</button>
      </form>
      {(relationships ?? []).length === 0 ? <p className="empty-state">Nenhum vínculo cadastrado.</p> : <ul aria-label="Vínculos cadastrados">{(relationships ?? []).map((relationship) => <li key={relationship.id}><strong>{relationshipLabels[relationship.relationship_kind as RelationshipKind]}</strong>: {nameById.get(relationship.related_person_id) ?? relationship.related_person_id}</li>)}</ul>}
    </section>
  </>
}
