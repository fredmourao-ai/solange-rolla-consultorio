import { redirect } from 'next/navigation'
import { FormRenderer } from '@/modules/forms/public'
import { loadPublicIntake } from '@/modules/forms/public'
import { getCapabilityPageSession } from '../session'
import { createPublicIntakeRuntime } from '../intake-runtime'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PublicFormPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string; erro?: string }>
}) {
  const session = await getCapabilityPageSession({ purpose: 'form_fill', subjectType: 'form_submission' })
  if (!session) redirect('/link-expirado')
  const runtime = createPublicIntakeRuntime(session)
  const intake = await loadPublicIntake(session, {
    repository: runtime.formRepository,
    crypto: runtime.crypto,
    issueActionToken: runtime.issueActionToken,
  })
  if (intake.status === 'submitted') redirect('/formulario/assinar')
  if (intake.status === 'signed') redirect('/formulario-concluido')
  if (!intake.actionTokens.save) redirect('/link-expirado')

  const query = await searchParams
  return (
    <section className="public-flow" aria-labelledby="public-form-title">
      <p className="eyebrow">Pré-consulta</p>
      <h1 id="public-form-title">Formulário da consulta</h1>
      <p>Preencha com calma. Você pode salvar e continuar enquanto este link estiver válido.</p>
      {query.salvo === '1' && <p role="status" className="ui-notice">Rascunho salvo com segurança.</p>}
      {query.erro && <p role="alert" className="ui-error">Revise os campos obrigatórios e tente novamente.</p>}
      <form method="post" action="/api/public/formulario/review" className="public-flow__form">
        <input type="hidden" name="_save_token" value={intake.actionTokens.save.token} />
        <FormRenderer template={intake.template} answers={intake.answers} />
        <div className="public-flow__actions">
          <button className="ui-button ui-button--outline" type="submit" formAction="/api/public/formulario/draft">
            Salvar e continuar
          </button>
          <button className="ui-button" type="submit">Revisar respostas</button>
        </div>
      </form>
      <p className="public-flow__privacy">Suas respostas sensíveis são armazenadas de forma criptografada.</p>
    </section>
  )
}
