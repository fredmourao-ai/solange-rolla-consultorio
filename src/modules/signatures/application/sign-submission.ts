import { hashCanonical } from '../domain/hash'
import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'

type SignSubmissionInput = {
  submissionVersionId: string
  declarationVersion: string
  typedName: string
  source: 'patient_capability' | 'staff'
  answers: Record<string, unknown>
  idempotencyKey: string
  acceptedLegalDocuments: Array<{ id: string; version: number; contentHash: string }>
  publicActionContext?: PublicActionContext
}

type Evidence = {
  submissionVersionId: string
  declarationVersion: string
  typedName: string
  source: SignSubmissionInput['source']
  canonicalHashSha256: string
  signedAt: string
}

type SignatureRepository = {
  createEvidence(evidence: Evidence): Promise<{ id: string } & Evidence>
  enqueueDocument(job: { idempotencyKey: string; signatureEvidenceId: string }): Promise<{ id: string } & typeof job>
}

export async function signSubmission(
  input: SignSubmissionInput,
  repository: SignatureRepository,
): Promise<{ evidence: { id: string } & Evidence; job: { id: string; idempotencyKey: string; signatureEvidenceId: string } }> {
  if (!input.typedName.trim()) throw new Error('INVALID_TYPED_NAME')
  if (input.source === 'patient_capability') assertPublicActionSubject(input.publicActionContext, 'sign_submission', input.submissionVersionId)
  if (input.acceptedLegalDocuments.length === 0) throw new Error('LEGAL_ACCEPTANCE_REQUIRED')
  const canonicalHashSha256 = hashCanonical({
    declarationVersion: input.declarationVersion,
    answers: input.answers,
    acceptedLegalDocuments: input.acceptedLegalDocuments,
  })
  const evidence = await repository.createEvidence({
    submissionVersionId: input.submissionVersionId,
    declarationVersion: input.declarationVersion,
    typedName: input.typedName.trim(),
    source: input.source,
    canonicalHashSha256,
    signedAt: new Date().toISOString(),
  })
  const job = await repository.enqueueDocument({
    idempotencyKey: input.idempotencyKey,
    signatureEvidenceId: evidence.id,
  })
  return { evidence, job }
}
