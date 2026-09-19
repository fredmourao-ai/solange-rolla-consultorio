import Link from 'next/link'
import type { FiscalDocumentStatus } from '@/modules/fiscal/public'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { cancelMockNfseAction, issueMockNfseAction } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FiscalPerson = { id: string; civil_name: string; preferred_name?: string | null; cpf_normalized: string | null; fiscal_address: unknown }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const sourceKindLabels: Record<string, string> = {
  appointment_completed: 'Consulta realizada',
  appointment_late_cancellation: 'Cancelamento fora do prazo',
  appointment_no_show: 'Falta em consulta',
  event_registration: 'Inscrição em evento',
  other_service: 'Outro serviço',
}
const issuanceRuleLabels: Record<string, string> = {
  manual_review: 'Revisão manual',
  automatic: 'Emissão automática',
  not_issuable: 'Não emitível',
}
const documentStatusLabels: Record<FiscalDocumentStatus, string> = {
  not_ready: 'Tratamento fiscal pendente',
  ready: 'Pronto para revisão',
  queued: 'Aguardando emissão',
  processing: 'Emitindo',
  issued: 'Documento emitido',
  failed_retryable: 'Erro temporário',
  failed_final: 'Erro requer ação',
  cancel_requested: 'Cancelamento solicitado',
  cancelled: 'Documento cancelado',
  replaced: 'Documento substituído',
}
const issuerKindLabels: Record<string, string> = {
  individual: 'Pessoa física',
  company: 'Pessoa jurídica',
}

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
    <PageHeader title="Homologação fiscal" description="Fluxo sintético de NFS-e para teste. A emissão real permanece bloqueada até o gate contábil de produção." />
    <p><Link href="/fiscal">← Voltar ao fiscal</Link></p>
    <aside role="status"><strong>Ambiente de simulação.</strong> Nenhuma NFS-e real é transmitida nesta tela. Use-a para revisar dados, regras fiscais e documentos antes da ativação em produção.</aside>
    <section><h2>Prontidão para emissão</h2>
      <p>Confira se o perfil fiscal está completo e quais tipos de origem já estão autorizados para emissão.</p>
      <ul>{profiles.map((profile) => <li key={profile.id}>Perfil v{profile.version}: <strong>{profile.issuer_document && profile.municipality_code && profile.service_code && profile.tax_regime ? 'Completo' : 'Incompleto'}</strong> · {issuerKindLabels[profile.issuer_kind] ?? profile.issuer_kind}</li>)}</ul>
      <ul>{treatments.map((treatment) => <li key={treatment.id}><strong>{sourceKindLabels[treatment.source_kind] ?? treatment.source_kind}</strong>: {issuanceRuleLabels[treatment.issuance_rule] ?? treatment.issuance_rule} · Aprovação contábil: {treatment.approved ? 'concluída' : 'pendente'} · Emissão real: {treatment.enabled_for_live ? 'habilitada' : 'bloqueada'}</li>)}</ul>
    </section>
    <section><h2>Solicitar NFS-e sintética</h2><p>Preencha a origem e o tomador, confira o tratamento aplicável e confirme a revisão antes de emitir a simulação.</p>
      {people.length === 0 ? <p>Nenhum tomador fiscal disponível para este perfil de acesso.</p> : null}
      <form action={issueMockNfseAction} className="stack-form">
        <label>Origem <select name="source_type">{treatments.filter((t) => t.issuance_rule !== 'not_issuable').map((t) => <option key={t.id} value={t.source_kind}>{sourceKindLabels[t.source_kind] ?? t.source_kind}</option>)}</select></label>
        <label>ID da origem <input name="source_id" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" /></label>
        <label>Paciente <select name="person_id" required>{people.map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label>
        <label>Tomador/pagador <select name="payer_person_id" required>{people.map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name} {person.cpf_normalized ? '' : '(CPF ausente)'}</option>)}</select></label>
        <label>Valor <input name="amount" inputMode="decimal" required /></label>
        <label>Perfil fiscal <select name="profile_id">{profiles.map((profile) => <option key={profile.id} value={profile.id}>v{profile.version} — {profile.issuer_document}</option>)}</select></label>
        <label>Tratamento <select name="treatment_id">{treatments.filter((t) => t.issuance_rule !== 'not_issuable').map((t) => <option key={t.id} value={t.id}>{sourceKindLabels[t.source_kind] ?? t.source_kind} v{t.version} · {issuanceRuleLabels[t.issuance_rule] ?? t.issuance_rule}</option>)}</select></label>
        <label><input type="checkbox" name="review_ack" value="yes" required /> Revisei origem, tomador, valor e tratamento; emitir somente no mock/sandbox.</label>
        <button type="submit" disabled={people.length === 0}>Emitir NFS-e mock</button>
      </form>
    </section>
    <section><h2>Documentos</h2>{docs.map((doc) => <article key={doc.id} className="card">
      <h3>{personNames.get(doc.person_id) || 'Pessoa'} — {money.format(doc.amount_cents / 100)}</h3>
      <p><span className="operational-status">{documentStatusLabels[doc.status as FiscalDocumentStatus]}</span> · {sourceKindLabels[doc.source_type] ?? doc.source_type} · Provedor: {doc.provider === 'mock' ? 'Simulação' : doc.provider}</p>
      <details className="operational-technical"><summary>Detalhes técnicos</summary><p>ID externo: {doc.external_id || '—'} · Protocolo: {doc.protocol || '—'}</p><p>Artefatos privados: XML {doc.xml_path ? '✓' : '—'} · PDF {doc.pdf_path ? '✓' : '—'}</p></details>
      {doc.provider === 'mock' && doc.status === 'issued' ? <form action={cancelMockNfseAction} className="stack-form">
        <input type="hidden" name="fiscal_document_id" value={doc.id} />
        <label>Motivo do cancelamento <input name="reason" required /></label><button type="submit">Cancelar NFS-e mock</button>
      </form> : null}
    </article>)}</section>
  </>
}
