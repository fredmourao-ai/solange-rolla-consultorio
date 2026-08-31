import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'
import { hashCanonical } from '../domain/hash'

export type SignSubmissionInput = {
  submissionVersionId: string
  declarationVersion: string
  typedName: string
  source: 'patient_capability' | 'staff'
  answers: Record<string, unknown>
  idempotencyKey: string
  acceptedLegalDocuments: Array<{ id: string; version: number; contentHash: string }>
  publicActionContext?: PublicActionContext
}

export type SignatureEvidence = {
  id: string
  submissionVersionId: string
  declarationVersion: string
  typedName: string
  source: SignSubmissionInput['source']
  canonicalHashSha256: string
  signedAt: string
}

export type SignatureDocumentJob = {
  id: string
  idempotencyKey: string
  signatureEvidenceId: string
}

export type SignSubmissionResult = { evidence: SignatureEvidence; job: SignatureDocumentJob }

export type SignatureRepository = {
  findByIdempotencyKey(idempotencyKey: string): Promise<SignSubmissionResult | null>
  signAtomically(input: {
    evidence: Omit<SignatureEvidence, 'id'>
    idempotencyKey: string
  }): Promise<SignSubmissionResult>
}

function assertIdempotentMatch(
  existing: SignSubmissionResult,
  expected: Omit<SignatureEvidence, 'id' | 'signedAt'>,
  idempotencyKey: string,
): void {
  const evidence = existing.evidence
  if (
    existing.job.idempotencyKey !== idempotencyKey ||
    evidence.submissionVersionId !== expected.submissionVersionId ||
    evidence.declarationVersion !== expected.declarationVersion ||
    evidence.typedName !== expected.typedName ||
    evidence.source !== expected.source ||
    evidence.canonicalHashSha256 !== expected.canonicalHashSha256
  ) {
    throw new Error('IDEMPOTENCY_KEY_CONFLICT')
  }
}

export async function signSubmission(
  input: SignSubmissionInput,
  repository: SignatureRepository,
): Promise<SignSubmissionResult> {
  const typedName = input.typedName.trim()
  if (!typedName) throw new Error('INVALID_TYPED_NAME')
  if (input.source === 'patient_capability') {
    assertPublicActionSubject(input.publicActionContext, 'sign_submission', input.submissionVersionId)
  }
  if (input.acceptedLegalDocuments.length === 0) throw new Error('LEGAL_ACCEPTANCE_REQUIRED')

  const canonicalHashSha256 = hashCanonical({
    declarationVersion: input.declarationVersion,
    answers: input.answers,
    acceptedLegalDocuments: input.acceptedLegalDocuments,
  })
  const expected = {
    submissionVersionId: input.submissionVersionId,
    declarationVersion: input.declarationVersion,
    typedName,
    source: input.source,
    canonicalHashSha256,
  }

  const existing = await repository.findByIdempotencyKey(input.idempotencyKey)
  if (existing) {
    assertIdempotentMatch(existing, expected, input.idempotencyKey)
    return existing
  }

  return repository.signAtomically({
    evidence: { ...expected, signedAt: new Date().toISOString() },
    idempotencyKey: input.idempotencyKey,
  })
}
