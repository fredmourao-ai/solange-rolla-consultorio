import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { canonicalCapabilityDestination } from '@/platform/capabilities/redirect'
import { serverEnv } from '@/platform/env/server'
import { getCapabilityPageSession } from '@/app/(capability)/session'
import { createPublicIntakeRuntime } from '@/app/(capability)/intake-runtime'
import { loadPublicIntake } from '@/modules/forms/public'
import { recordLegalAcceptance } from '@/modules/forms/public'
import { signPublicSubmission } from '@/modules/signatures/public'
import { revokeCapabilitySession } from '@/platform/capabilities/revoke-session'
import { createCapabilityRevocationRepository } from '@/platform/capabilities/revocation-repository'
import { CAPABILITY_COOKIE_NAME } from '@/platform/capabilities/cookie'
import { parseBoundedFormData } from '@/platform/security/request-limits'

const REQUIRED_LEGAL_KEYS = [
  'service_terms',
  'cancellation_policy',
  'truthfulness_declaration',
  'privacy_notice',
] as const

export async function POST(request: Request) {
  const appUrl = serverEnv().APP_URL
  const session = await getCapabilityPageSession({ purpose: 'form_fill', subjectType: 'form_submission' })
  if (!session) return NextResponse.redirect(canonicalCapabilityDestination('/link-expirado', appUrl), 303)

  try {
    const formData = await parseBoundedFormData(request, 'signature')
    const runtime = createPublicIntakeRuntime(session)
    const intake = await loadPublicIntake(session, {
      repository: runtime.formRepository,
      crypto: runtime.crypto,
      issueActionToken: runtime.issueActionToken,
    })
    if (intake.status !== 'submitted' || !intake.currentVersionId || !intake.actionTokens.sign) {
      throw new Error('FORM_SUBMISSION_NOT_SIGNABLE')
    }

    const legalDocuments = []
    for (const key of REQUIRED_LEGAL_KEYS) {
      const document = await runtime.legalRepository.findActive(key)
      if (!document) throw new Error('LEGAL_DOCUMENT_NOT_FOUND')
      if (formData.get(`accept_${key}`) !== 'true') throw new Error('LEGAL_ACCEPTANCE_REQUIRED')
      legalDocuments.push(document)
    }

    for (const document of legalDocuments) {
      await recordLegalAcceptance(document, intake.subjectId, 'capability', runtime.legalRepository)
    }

    const truthfulness = legalDocuments.find((document) => document.key === 'truthfulness_declaration')
    if (!truthfulness) throw new Error('LEGAL_DOCUMENT_NOT_FOUND')

    await signPublicSubmission({
      session,
      request,
      actionToken: String(formData.get('_sign_token') ?? ''),
      submissionVersionId: intake.currentVersionId,
      declarationVersion: `truthfulness-v${truthfulness.version}`,
      typedName: String(formData.get('typed_name') ?? ''),
      answers: intake.answers,
      acceptedLegalDocuments: legalDocuments.map((document) => ({
        id: document.id,
        version: document.version,
        contentHash: document.contentHash,
      })),
    }, {
      repository: runtime.signatureRepository,
      allowedOrigins: [runtime.env.APP_URL],
      actionSecret: runtime.env.PUBLIC_ACTION_HMAC_KEY,
      nonceStore: runtime.nonceStore,
      rateLimiter: runtime.rateLimiter,
    })
    await revokeCapabilitySession(session.id, createCapabilityRevocationRepository(runtime.client))
    const cookieStore = await cookies()
    cookieStore.delete(CAPABILITY_COOKIE_NAME)
    return NextResponse.redirect(canonicalCapabilityDestination('/formulario-concluido', appUrl), 303)
  } catch {
    return NextResponse.redirect(canonicalCapabilityDestination('/formulario/assinar?erro=1', appUrl), 303)
  }
}
