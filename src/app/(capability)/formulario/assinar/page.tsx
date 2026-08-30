import { redirect } from 'next/navigation'
import { loadPublicIntake } from '@/modules/forms/application/public-intake'
import { getCapabilityPageSession } from '../../session'
import { createPublicIntakeRuntime } from '../../intake-runtime'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const REQUIRED_LEGAL_KEYS = [
  'service_terms',
  'cancellation_policy',
  'truthfulness_declaration',
  'privacy_notice',
] as const

export default async function SignPage({
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
  if (intake.status === 'draft') redirect('/formulario/revisao')
  if (intake.status === 'signed') redirect('/formulario-concluido')
  if (intake.status !== 'submitted' || !intake.currentVersionId || !intake.actionTokens.sign) redirect('/link-expirado')

  const legalDocuments = []
  for (const key of REQUIRED_LEGAL_KEYS) {
    const document = await runtime.legalRepository.findActive(key)
    if (!document) redirect('/link-expirado')
    legalDocuments.push(document)
  }
  const query = await searchParams
  return (
    <section className="public-flow" aria-labelledby="sign-title">
      <p className="eyebrow">Etapa 3 de 3</p>
      <h1 id="sign-title">Termos e assinatura</h1>
      <p>Leia os documentos abaixo. A assinatura confirma as respostas revisadas e estes termos.</p>
      {query.erro && <p role="alert" className="ui-error">Não foi possível concluir. Revise os aceites e tente novamente.</p>}

      <form method="post" action="/api/public/formulario/sign" className="public-flow__form">
        <input type="hidden" name="_sign_token" value={intake.actionTokens.sign.token} />
        {legalDocuments.map((document) => (
          <section className="ui-card" key={document.id} aria-labelledby={`legal-${document.key}`}>
            <h2 id={`legal-${document.key}`} className="ui-card__title">{document.key === 'cancellation_policy' ? 'Política de cancelamento e faltas' : document.key === 'truthfulness_declaration' ? 'Declaração de veracidade' : document.key === 'privacy_notice' ? 'Aviso de privacidade' : 'Termos do serviço'}</h2>
            <p className="public-flow__legal-text">{document.content}</p>
            <label className="choice-control">
              <input className="ui-checkbox" type="checkbox" name={`accept_${document.key}`} value="true" required />
              <span>Li e concordo com este documento (versão {document.version}).</span>
            </label>
          </section>
        ))}
        <div className="form-field">
          <label className="form-field__label" htmlFor="typed-name">Digite seu nome completo para assinar</label>
          <input className="ui-input" id="typed-name" name="typed_name" type="text" autoComplete="name" required maxLength={160} />
        </div>
        <p className="public-flow__privacy">Ao confirmar, suas respostas revisadas serão bloqueadas contra edição e a evidência da assinatura será registrada.</p>
        <button className="ui-button" type="submit">Confirmar e assinar</button>
      </form>
    </section>
  )
}
