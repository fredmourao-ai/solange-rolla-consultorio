import 'server-only'
import type { CapabilitySessionRecord } from '../../../platform/capabilities/session'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import { createPublicActionContext } from '../../../platform/security/public-action'
import { requireTrustedOrigin } from '../../../platform/security/origin'
import type { RateLimitResult } from '../../../platform/security/rate-limit'
import { validateAnswers } from '../domain/form-schema'
import { parseFormDataAnswers } from './parse-form-data'
import type { PublicIntakeRepository } from './public-intake'
import { readSubmission } from './read-submission'
import { saveDraft } from './save-draft'
import { submitForm } from './submit-form'

type PublicIntakeMutationRepository = PublicIntakeRepository & {
  save(input: Record<string, unknown>): Promise<Record<string, unknown>>
  submit(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

type MutationDependencies = {
  repository: PublicIntakeMutationRepository
  crypto: SensitiveDataCrypto
  allowedOrigins: readonly string[]
  actionSecret: string
  nonceStore: { consumeOnce(nonce: string): Promise<boolean> }
  rateLimiter: {
    consume(input: { scope: string; subjectKey: string; limit: number; windowSeconds: number }): Promise<RateLimitResult>
  }
}

type PublicMutationRequest = {
  session: CapabilitySessionRecord
  request: Request
  actionToken: string
}

type MutationInput = PublicMutationRequest & {
  formData: FormData
}
function assertFormSession(session: CapabilitySessionRecord): void {
  if (session.purpose !== 'form_fill' || session.subjectType !== 'form_submission') {
    throw new Error('CAPABILITY_SCOPE_INVALID')
  }
}

async function authorizeMutation(
  input: PublicMutationRequest,
  dependencies: MutationDependencies,
  purpose: 'public_form_save' | 'public_form_submit',
) {
  assertFormSession(input.session)
  requireTrustedOrigin(input.request, dependencies.allowedOrigins)
  const limit = await dependencies.rateLimiter.consume({
    scope: 'public_form_save',
    subjectKey: input.session.id,
    limit: purpose === 'public_form_save' ? 30 : 12,
    windowSeconds: 300,
  })
  if (!limit.allowed) throw new Error('PUBLIC_RATE_LIMITED')

  return createPublicActionContext({
    request: input.request,
    allowedOrigins: dependencies.allowedOrigins,
    token: input.actionToken,
    secret: dependencies.actionSecret,
    capabilitySessionId: input.session.id,
    purpose,
    subjectId: input.session.subjectId,
    store: dependencies.nonceStore,
  })
}
async function loadDraft(
  session: CapabilitySessionRecord,
  repository: PublicIntakeMutationRepository,
) {
  const bound = await repository.loadBound(session.subjectId)
  if (!bound || bound.id !== session.subjectId) throw new Error('FORM_SUBMISSION_NOT_FOUND')
  if (bound.status !== 'draft') throw new Error('FORM_SUBMISSION_NOT_EDITABLE')
  return bound
}

export async function savePublicIntakeDraft(
  input: MutationInput,
  dependencies: MutationDependencies,
): Promise<Record<string, unknown>> {
  const context = await authorizeMutation(input, dependencies, 'public_form_save')
  const bound = await loadDraft(input.session, dependencies.repository)
  const answers = parseFormDataAnswers(bound.template, input.formData)
  return saveDraft({
    submissionId: bound.id,
    templateVersionId: bound.template.id,
    classification: bound.template.classification,
    answers,
    template: bound.template,
    source: 'patient_capability',
    publicActionContext: context,
  }, { repository: dependencies.repository, crypto: dependencies.crypto })
}
export async function submitPublicIntake(
  input: MutationInput,
  dependencies: MutationDependencies,
): Promise<Record<string, unknown>> {
  const context = await authorizeMutation(input, dependencies, 'public_form_submit')
  const bound = await loadDraft(input.session, dependencies.repository)
  const answers = parseFormDataAnswers(bound.template, input.formData)
  return submitForm({
    submissionId: bound.id,
    templateVersionId: bound.template.id,
    template: bound.template,
    answers,
    source: 'patient_capability',
    publicActionContext: context,
  }, { repository: dependencies.repository, crypto: dependencies.crypto })
}

export async function savePublicIntakeForReview(
  input: MutationInput,
  dependencies: MutationDependencies,
): Promise<Record<string, unknown>> {
  const context = await authorizeMutation(input, dependencies, 'public_form_save')
  const bound = await loadDraft(input.session, dependencies.repository)
  const answers = parseFormDataAnswers(bound.template, input.formData)
  if (validateAnswers(bound.template, answers).length > 0) throw new Error('invalid form answers')

  return saveDraft({
    submissionId: bound.id,
    templateVersionId: bound.template.id,
    classification: bound.template.classification,
    answers,
    template: bound.template,
    source: 'patient_capability',
    publicActionContext: context,
  }, { repository: dependencies.repository, crypto: dependencies.crypto })
}
export async function submitReviewedPublicIntake(
  input: PublicMutationRequest,
  dependencies: MutationDependencies,
): Promise<Record<string, unknown>> {
  const context = await authorizeMutation(input, dependencies, 'public_form_submit')
  const bound = await loadDraft(input.session, dependencies.repository)
  if (!bound.currentVersionId) throw new Error('FORM_DRAFT_NOT_SAVED')

  const current = await readSubmission({
    submissionId: bound.id,
    source: 'patient_capability',
    publicActionContext: {
      origin: context.origin,
      capabilitySessionId: context.capabilitySessionId,
      purpose: 'public_form_read',
      subjectId: bound.id,
    },
  }, { repository: dependencies.repository, crypto: dependencies.crypto })

  return submitForm({
    submissionId: bound.id,
    templateVersionId: bound.template.id,
    template: bound.template,
    answers: current.answers,
    source: 'patient_capability',
    publicActionContext: context,
  }, { repository: dependencies.repository, crypto: dependencies.crypto })
}
