import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FormRenderer } from '@/modules/forms/public'
import { loadPublicIntake } from '@/modules/forms/application/public-intake'
import { getCapabilityPageSession } from '../../session'
import { createPublicIntakeRuntime } from '../../intake-runtime'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
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
  if (intake.status !== 'draft' || !intake.currentVersionId || !intake.actionTokens.submit) redirect('/formulario')
  const query = await searchParams

  return (
    <section className="public-flow" aria-labelledby="review-title">
      <p className="eyebrow">Etapa 2 de 3</p>
      <h1 id="review-title">Revise suas respostas</h1>
      <p>Confira antes de enviar. Para alterar qualquer informação, volte ao formulário.</p>
      {query.erro && <p role="alert" className="ui-error">Não foi possível enviar. Tente novamente.</p>}
      <div className="public-flow__review">
        <FormRenderer template={intake.template} answers={intake.answers} disabled />
      </div>
      <form method="post" action="/api/public/formulario/submit-reviewed" className="public-flow__actions">
        <input type="hidden" name="_submit_token" value={intake.actionTokens.submit.token} />
        <Link className="ui-button ui-button--outline" href="/formulario">Corrigir respostas</Link>
        <button className="ui-button" type="submit">Confirmar e continuar</button>
      </form>
    </section>
  )
}
