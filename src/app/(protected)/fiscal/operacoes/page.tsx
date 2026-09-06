import Link from 'next/link'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { cancelMockNfseAction, issueMockNfseAction } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FiscalPerson = { id: string; civil_name: string; preferred_name?: string | null; cpf_normalized: string | null; fiscal_address: unknown }

export default async function FiscalOperationsPage() {
  const session = await getStaffSession()
  const authorized = authorizeStaffSession(session, ['psychologist_owner', 'accounting'])
  const client = await createServerSupabaseClient()
  const peopleQuery = authorized.role === 'accounting'
    ? client.from('accounting_people_view').select('id,civil_name,cpf_normalized,fiscal_address').order('civil_name')
    : client.from('people').select('id,civil_name,preferred_name,cpf_normalized,fiscal_address').order('civil_name')
  const [profilesResult, treatmentsResult, peopleResult, docsResult] = await Promise.all([
    client.from('fiscal_profiles').select('id,version,issuer_kind,issuer_document,municipality_code,service_code,tax_regime,active').eq('active', true).order('version', { ascending: false }),
    client.from('fiscal_treatments').select('id,source_kind,version,issuance_rule,approved,enabled_for_live').order('source_kind'),
    peopleQuery,
    client.from('fiscal_documents').select('id,source_type,source_id,person_id,amount_cents,status,provider,external_id,protocol,xml_path,pdf_path,issued_at,cancelled_at').order('created_at', { ascending: false }).limit(100),
  ])
  if (profilesResult.error) throw new Error(`FISCAL_PROFILES_READ_FAILED:${profilesResult.error.code}`)
  if (treatmentsResult.error) throw new Error(`FISCAL_TREATMENTS_READ_FAILED:${treatmentsResult.error.code}`)
  if (peopleResult.error) throw new Error(`FISCAL_PEOPLE_READ_FAILED:${peopleResult.error.code}`)
  if (docsResult.error) throw new Error(`FISCAL_DOCUMENTS_READ_FAILED:${docsResult.error.code}`)
  const profiles = profilesResult.data ?? []
  const treatments = treatmentsResult.data ?? []
  const people: FiscalPerson[] = (peopleResult.data ?? []).flatMap((person) => {
    if (!person.id || !person.civil_name) return []
    return [{
      id: person.id,
      civil_name: person.civil_name,
      preferred_name: 'preferred_name' in person ? person.preferred_name : null,
      cpf_normalized: person.cpf_normalized,
      fiscal_address: person.fiscal_address,
    }]
  })
  const docs = docsResult.data ?? []
  const personNames = new Map(people.map((person) => [person.id, person.preferred_name || person.civil_name]))

  return <>
    <PageHeader title="Homologação fiscal" description="Fluxo sintético de NFS-e para teste. O provedor live permanece bloqueado." />
    <p><Link href="/fiscal">← Voltar ao fiscal</Link></p>
    <aside role="status"><strong>Modo: MOCK/SANDBOX.</strong> Nenhuma NFS-e real é transmitida. A habilitação live continua dependente do gate contábil de produção.</aside>
    <section><h2>Readiness</h2>
      <ul>{profiles.map((profile) => <li key={profile.id}>Perfil v{profile.version}: {profile.issuer_document && profile.municipality_code && profile.service_code && profile.tax_regime ? 'completo' : 'incompleto'} ({profile.issuer_kind})</li>)}</ul>
      <ul>{treatments.map((treatment) => <li key={treatment.id}>{treatment.source_kind}: {treatment.issuance_rule} · aprovado={String(treatment.approved)} · live={String(treatment.enabled_for_live)}</li>)}</ul>
    </section>
    <section><h2>Solicitar NFS-e sintética</h2>
      {people.length === 0 ? <p>Nenhum tomador fiscal disponível para este perfil de acesso.</p> : null}
      <form action={issueMockNfseAction} className="stack-form">
        <label>Origem <select name="source_type">{treatments.filter((t) => t.issuance_rule !== 'not_issuable').map((t) => <option key={t.id} value={t.source_kind}>{t.source_kind}</option>)}</select></label>
        <label>ID da origem <input name="source_id" required pattern="[0-9a-fA-F-]{36}" /></label>
        <label>Paciente <select name="person_id" required>{people.map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label>
        <label>Tomador/pagador <select name="payer_person_id" required>{people.map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name} {person.cpf_normalized ? '' : '(CPF ausente)'}</option>)}</select></label>
        <label>Valor <input name="amount" required /></label>
        <label>Perfil fiscal <select name="profile_id">{profiles.map((profile) => <option key={profile.id} value={profile.id}>v{profile.version} — {profile.issuer_document}</option>)}</select></label>
        <label>Tratamento <select name="treatment_id">{treatments.filter((t) => t.issuance_rule !== 'not_issuable').map((t) => <option key={t.id} value={t.id}>{t.source_kind} v{t.version} ({t.issuance_rule})</option>)}</select></label>
        <label><input type="checkbox" name="review_ack" value="yes" required /> Revisei origem, tomador, valor e tratamento; emitir somente no mock/sandbox.</label>
        <button type="submit" disabled={people.length === 0}>Emitir NFS-e mock</button>
      </form>
    </section>
    <section><h2>Documentos</h2>{docs.map((doc) => <article key={doc.id} className="card">
      <h3>{personNames.get(doc.person_id) || 'Pessoa'} — R$ {(doc.amount_cents / 100).toFixed(2)}</h3>
      <p>{doc.source_type} · {doc.status} · provedor {doc.provider}</p>
      <p>External ID: {doc.external_id || '—'} · protocolo: {doc.protocol || '—'}</p>
      <p>Artefatos privados: XML {doc.xml_path ? '✓' : '—'} · PDF {doc.pdf_path ? '✓' : '—'}</p>
      {doc.provider === 'mock' && doc.status === 'issued' ? <form action={cancelMockNfseAction} className="stack-form">
        <input type="hidden" name="fiscal_document_id" value={doc.id} />
        <label>Motivo do cancelamento <input name="reason" required /></label><button type="submit">Cancelar NFS-e mock</button>
      </form> : null}
    </article>)}</section>
  </>
}
