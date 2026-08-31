import 'server-only'
import { createSensitiveDataCrypto } from '../../../platform/crypto/aes-gcm'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { DocumentArtifact, SignedDocumentRepository, SignedDocumentSource } from '../application/render-signed-document'

type SignatureClient = ReturnType<typeof createServiceRoleSupabaseClient>
type FieldSchema = { key: string; label: string }

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('DOCUMENT_SOURCE_INTEGRITY_ERROR')
  }
  return value as Record<string, unknown>
}

function parseFields(schema: unknown): FieldSchema[] {
  const record = asRecord(schema)
  if (!Array.isArray(record.fields)) throw new Error('DOCUMENT_SOURCE_INTEGRITY_ERROR')
  return record.fields.map((field) => {
    const item = asRecord(field)
    if (typeof item.key !== 'string' || typeof item.label !== 'string') {
      throw new Error('DOCUMENT_SOURCE_INTEGRITY_ERROR')
    }
    return { key: item.key, label: item.label }
  })
}
function artifactFromEvidence(row: {
  document_storage_path: string | null
  document_sha256: string | null
  document_byte_length: number | null
}): DocumentArtifact | null {
  if (!row.document_storage_path || !row.document_sha256 || row.document_byte_length === null) return null
  return {
    storagePath: row.document_storage_path,
    sha256: row.document_sha256,
    byteLength: row.document_byte_length,
    mediaType: 'application/pdf',
  }
}

export function createSupabaseSignedDocumentRepository(
  client: SignatureClient = createServiceRoleSupabaseClient(),
  crypto: SensitiveDataCrypto = createSensitiveDataCrypto(),
): SignedDocumentRepository {
  return {
    async findJob(jobId) {
      const { data: job, error: jobError } = await client
        .from('document_jobs')
        .select('id,idempotency_key,signature_evidence_id,status')
        .eq('id', jobId)
        .maybeSingle()
      if (jobError) throw jobError
      if (!job) return null
      const { data: evidence, error: evidenceError } = await client
        .from('signature_evidence')
        .select('id,submission_version_id,declaration_version,typed_name,signed_at,canonical_hash_sha256,document_status,document_storage_path,document_sha256,document_byte_length')
        .eq('id', job.signature_evidence_id)
        .maybeSingle()
      if (evidenceError) throw evidenceError
      if (!evidence) throw new Error('SIGNATURE_EVIDENCE_NOT_FOUND')

      return {
        id: job.id,
        evidenceId: evidence.id,
        idempotencyKey: job.idempotency_key,
        status: job.status,
        artifact: artifactFromEvidence(evidence),
      }
    },

    async loadSource(evidenceId) {
      const { data: evidence, error: evidenceError } = await client
        .from('signature_evidence')
        .select('id,submission_version_id,declaration_version,typed_name,signed_at,canonical_hash_sha256')
        .eq('id', evidenceId)
        .maybeSingle()
      if (evidenceError) throw evidenceError
      if (!evidence) throw new Error('SIGNATURE_EVIDENCE_NOT_FOUND')
      const { data: version, error: versionError } = await client
        .from('form_submission_versions')
        .select('id,submission_id,answers,answers_ciphertext,answers_iv,answers_auth_tag,key_version')
        .eq('id', evidence.submission_version_id)
        .maybeSingle()
      if (versionError) throw versionError
      if (!version) throw new Error('DOCUMENT_SOURCE_VERSION_NOT_FOUND')

      const { data: submission, error: submissionError } = await client
        .from('form_submissions')
        .select('id,template_version_id')
        .eq('id', version.submission_id)
        .maybeSingle()
      if (submissionError) throw submissionError
      if (!submission) throw new Error('DOCUMENT_SOURCE_SUBMISSION_NOT_FOUND')

      const { data: templateVersion, error: templateVersionError } = await client
        .from('form_template_versions')
        .select('id,template_id,version,data_classification,schema')
        .eq('id', submission.template_version_id)
        .maybeSingle()
      if (templateVersionError) throw templateVersionError
      if (!templateVersion) throw new Error('DOCUMENT_SOURCE_TEMPLATE_VERSION_NOT_FOUND')
      const { data: template, error: templateError } = await client
        .from('form_templates')
        .select('id,name')
        .eq('id', templateVersion.template_id)
        .maybeSingle()
      if (templateError) throw templateError
      if (!template) throw new Error('DOCUMENT_SOURCE_TEMPLATE_NOT_FOUND')

      let answers: Record<string, unknown>
      if (templateVersion.data_classification === 'sensitive') {
        if (!version.answers_ciphertext || !version.answers_iv || !version.answers_auth_tag || version.key_version === null) {
          throw new Error('DOCUMENT_SOURCE_INTEGRITY_ERROR')
        }
        try {
          const plaintext = await crypto.decrypt({
            alg: 'A256GCM', keyVersion: version.key_version, iv: version.answers_iv,
            ciphertext: version.answers_ciphertext, authTag: version.answers_auth_tag,
          }, { entity: 'form_submission', id: submission.id })
          answers = asRecord(JSON.parse(plaintext) as unknown)
        } catch (error) {
          throw new Error('DOCUMENT_SOURCE_INTEGRITY_ERROR', { cause: error })
        }
      } else {
        answers = asRecord(version.answers)
      }

      const fields = parseFields(templateVersion.schema).map((field) => ({ label: field.label, value: answers[field.key] }))
      const source: SignedDocumentSource = {
        formName: template.name,
        formVersion: templateVersion.version,
        declarationVersion: evidence.declaration_version,
        typedName: evidence.typed_name,
        signedAt: evidence.signed_at,
        canonicalHashSha256: evidence.canonical_hash_sha256,
        fields,
      }
      return source
    },

    async markReady(jobId, evidenceId, artifact) {
      const { error } = await client.rpc('persist_document_job_result', {
        p_job_id: jobId, p_evidence_id: evidenceId, p_result_status: 'ready', p_error_code: null,
        p_storage_path: artifact.storagePath, p_sha256: artifact.sha256, p_byte_length: artifact.byteLength,
      } as never)
      if (error) throw error
    },

    async markFailed(jobId, evidenceId, status, errorCode) {
      const { error } = await client.rpc('persist_document_job_result', {
        p_job_id: jobId, p_evidence_id: evidenceId, p_result_status: status, p_error_code: errorCode,
        p_storage_path: null, p_sha256: null, p_byte_length: null,
      } as never)
      if (error) throw error
    },
  }
}
