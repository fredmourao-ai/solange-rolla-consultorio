import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { Database } from '../../../platform/supabase/types'
import type {
  SignatureDocumentJob,
  SignatureEvidence,
  SignatureRepository,
  SignSubmissionResult,
} from '../application/sign-submission'

type SignatureClient = ReturnType<typeof createServiceRoleSupabaseClient>

function mapEvidence(row: {
  id: string
  submission_version_id: string
  declaration_version: string
  typed_name: string
  source: string
  canonical_hash_sha256: string
  signed_at: string
}): SignatureEvidence {
  return {
    id: row.id,
    submissionVersionId: row.submission_version_id,
    declarationVersion: row.declaration_version,
    typedName: row.typed_name,
    source: row.source as SignatureEvidence['source'],
    canonicalHashSha256: row.canonical_hash_sha256,
    signedAt: row.signed_at,
  }
}

function mapJob(row: Pick<Database['public']['Tables']['document_jobs']['Row'], 'id' | 'idempotency_key' | 'signature_evidence_id'>): SignatureDocumentJob {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    signatureEvidenceId: row.signature_evidence_id,
  }
}

function mapRpcResult(
  row: Database['public']['Functions']['sign_form_submission']['Returns'][number],
): SignSubmissionResult {
  return {
    evidence: {
      id: row.result_evidence_id,
      submissionVersionId: row.result_submission_version_id,
      declarationVersion: row.result_declaration_version,
      typedName: row.result_typed_name,
      source: row.result_source as SignatureEvidence['source'],
      canonicalHashSha256: row.result_canonical_hash_sha256,
      signedAt: row.result_signed_at,
    },
    job: {
      id: row.result_job_id,
      idempotencyKey: row.result_idempotency_key,
      signatureEvidenceId: row.result_signature_evidence_id,
    },
  }
}
export function createSupabaseSignatureRepository(
  client: SignatureClient = createServiceRoleSupabaseClient(),
): SignatureRepository {
  return {
    async findByIdempotencyKey(idempotencyKey) {
      const { data: job, error: jobError } = await client
        .from('document_jobs')
        .select('id, idempotency_key, signature_evidence_id, status, created_at')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (jobError) throw jobError
      if (!job) return null

      const { data: evidence, error: evidenceError } = await client
        .from('signature_evidence')
        .select('id, submission_version_id, declaration_version, typed_name, source, canonical_hash_sha256, signed_at')
        .eq('id', job.signature_evidence_id)
        .maybeSingle()
      if (evidenceError) throw evidenceError
      if (!evidence) throw new Error('SIGNATURE_EVIDENCE_NOT_FOUND')

      return { evidence: mapEvidence(evidence), job: mapJob(job) }
    },
    async signAtomically(input) {
      const { data, error } = await client.rpc('sign_form_submission', {
        p_submission_version_id: input.evidence.submissionVersionId,
        p_declaration_version: input.evidence.declarationVersion,
        p_typed_name: input.evidence.typedName,
        p_source: input.evidence.source,
        p_canonical_hash_sha256: input.evidence.canonicalHashSha256,
        p_idempotency_key: input.idempotencyKey,
      })
      if (error) throw error
      const row = data?.[0]
      if (!row) throw new Error('SIGNATURE_WRITE_FAILED')
      return mapRpcResult(row)
    },
  }
}
