import { redirect } from 'next/navigation'
import { loadPublicIntake } from '@/modules/forms/application/public-intake'
import { SignatureStep } from '@/modules/signatures/ui/signature-step'
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
      <SignatureStep
        actionToken={intake.actionTokens.sign.token}
        legalDocuments={legalDocuments}
        hasError={Boolean(query.erro)}
      />
    </section>
  )
}
