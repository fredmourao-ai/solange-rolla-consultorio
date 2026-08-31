import { redirect } from 'next/navigation'
import { getCapabilityPageSession } from '../session'
import { createPublicAppointmentRuntime } from '../appointment-runtime'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short',
})

export default async function AppointmentConfirmationPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const session = await getCapabilityPageSession({ purpose: 'appointment_response', subjectType: 'appointment' })
  if (!session) redirect('/link-expirado')
  const runtime = createPublicAppointmentRuntime(session)
  const { data, error } = await runtime.client
    .from('appointments')
    .select('id,starts_at,status,cancellation_deadline_at,person:people!appointments_person_id_fkey(civil_name,preferred_name),service:services!appointments_service_id_fkey(name)')
    .eq('id', session.subjectId).single()
  if (error || !data) redirect('/link-expirado')

  const person = Array.isArray(data.person) ? data.person[0] : data.person
  const service = Array.isArray(data.service) ? data.service[0] : data.service
  const late = runtime.now().getTime() > new Date(data.cancellation_deadline_at).getTime()
  const tokens = { confirm: runtime.issueActionToken(), reschedule: runtime.issueActionToken(), cancel: runtime.issueActionToken() }
  const query = await searchParams
  return <section className="public-flow" aria-labelledby="appointment-confirmation-title">
    <p className="eyebrow">Sua consulta</p>
    <h1 id="appointment-confirmation-title">Confirme sua consulta</h1>
    <p>{person?.preferred_name || person?.civil_name || 'Paciente'}, sua consulta de {service?.name || 'atendimento'} está marcada para <strong>{dateTime.format(new Date(data.starts_at))}</strong>.</p>
    {query.ok === 'confirm' && <p role="status" className="ui-notice">Consulta confirmada.</p>}
    {query.ok === 'reschedule' && <p role="status" className="ui-notice">Pedido de reagendamento recebido. A secretaria entrará em contato.</p>}
    {query.ok === 'cancel' && <p role="status" className="ui-notice">Cancelamento registrado.</p>}
    {query.erro && <p role="alert" className="ui-error">Não foi possível registrar sua resposta. Tente novamente pelo link recebido.</p>}

    <div className="public-flow__actions">
      <form method="post" action="/api/public/consulta/respond">
        <input type="hidden" name="action" value="confirm" />
        <input type="hidden" name="_action_token" value={tokens.confirm.token} />
        <button className="ui-button" type="submit">Confirmar consulta</button>
      </form>
      <form method="post" action="/api/public/consulta/respond">
        <input type="hidden" name="action" value="request_reschedule" />
        <input type="hidden" name="_action_token" value={tokens.reschedule.token} />
        <button className="ui-button ui-button--outline" type="submit">Solicitar reagendamento</button>
      </form>
    </div>
    <form method="post" action="/api/public/consulta/respond" className="public-flow__form">
      <input type="hidden" name="action" value="cancel" />
      <input type="hidden" name="_action_token" value={tokens.cancel.token} />
      {late ? <>
        <p className="ui-error">O prazo de cancelamento sem cobrança terminou em {dateTime.format(new Date(data.cancellation_deadline_at))}. O cancelamento poderá gerar cobrança conforme a política aceita.</p>
        <label><input type="checkbox" name="acknowledge_late_charge" value="true" required /> Estou ciente de que o cancelamento está fora do prazo e poderá haver cobrança.</label>
      </> : <p>Você pode cancelar sem cobrança até {dateTime.format(new Date(data.cancellation_deadline_at))}.</p>}
      <button className="ui-button ui-button--outline" type="submit">Cancelar consulta</button>
    </form>
  </section>
}
