import 'server-only'
import type { CapabilitySessionRecord } from '../../../platform/capabilities/session'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import type { PublicActionContext } from '../../../platform/security/public-action'
import type { FormTemplateVersion } from '../domain/form-schema'
import { readSubmission, type ReadSubmissionRepository, type StoredFormSubmission } from './read-submission'
import type { FormSubmissionStatus } from './start-submission'

export type PublicIntakeBoundSubmission = {
  id: string
  subjectId: string
  status: FormSubmissionStatus
  template: FormTemplateVersion
  currentVersionId?: string
  stored: StoredFormSubmission
}

export type PublicIntakeRepository = ReadSubmissionRepository & {
  loadBound(submissionId: string): Promise<PublicIntakeBoundSubmission | null>
}

export type IssuedActionToken = { token: string; expiresAt: string }
export type PublicIntakeActionTokenIssuer = (input: {
  capabilitySessionId: string
  purpose: string
  subjectId: string
}) => IssuedActionToken
function publicReadContext(session: CapabilitySessionRecord, submissionId: string): PublicActionContext {
  return {
    origin: 'server',
    capabilitySessionId: session.id,
    purpose: 'public_form_read',
    subjectId: submissionId,
  }
}

function issue(
  issuer: PublicIntakeActionTokenIssuer,
  session: CapabilitySessionRecord,
  purpose: string,
  subjectId: string,
): IssuedActionToken {
  return issuer({ capabilitySessionId: session.id, purpose, subjectId })
}

export async function loadPublicIntake(
  session: CapabilitySessionRecord,
  dependencies: {
    repository: PublicIntakeRepository
    crypto: SensitiveDataCrypto
    issueActionToken: PublicIntakeActionTokenIssuer
  },
) {
  if (session.purpose !== 'form_fill' || session.subjectType !== 'form_submission') {
    throw new Error('CAPABILITY_SCOPE_INVALID')
  }
  const bound = await dependencies.repository.loadBound(session.subjectId)
  if (!bound || bound.id !== session.subjectId) throw new Error('FORM_SUBMISSION_NOT_FOUND')

  let answers: Record<string, unknown> = {}
  if (bound.currentVersionId) {
    const current = await readSubmission({
      submissionId: bound.id,
      source: 'patient_capability',
      publicActionContext: publicReadContext(session, bound.id),
    }, { repository: dependencies.repository, crypto: dependencies.crypto })
    answers = current.answers
  }

  const actionTokens: {
    save?: IssuedActionToken
    submit?: IssuedActionToken
    sign?: IssuedActionToken
  } = {}
  if (bound.status === 'draft') {
    actionTokens.save = issue(dependencies.issueActionToken, session, 'public_form_save', bound.id)
    actionTokens.submit = issue(dependencies.issueActionToken, session, 'public_form_submit', bound.id)
  } else if (bound.status === 'submitted' && bound.currentVersionId) {
    actionTokens.sign = issue(dependencies.issueActionToken, session, 'sign_submission', bound.currentVersionId)
  }

  return {
    submissionId: bound.id,
    subjectId: bound.subjectId,
    status: bound.status,
    template: bound.template,
    answers,
    currentVersionId: bound.currentVersionId,
    actionTokens,
  }
}
