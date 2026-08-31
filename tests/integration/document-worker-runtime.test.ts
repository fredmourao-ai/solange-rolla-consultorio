import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { createSensitiveDataCrypto } from '../../src/platform/crypto/aes-gcm'
import { createQueue } from '../../src/platform/queue/queue'
import { createServerSupabaseQueueBackend } from '../../src/platform/queue/supabase-queue'
import { createServiceRoleSupabaseClient } from '../../src/platform/supabase/service-role'
import { renderSignedDocument } from '../../src/modules/signatures/application/render-signed-document'
import { renderSignedFormPdf } from '../../src/modules/signatures/infrastructure/pdf-renderer'
import { createSupabaseSignedDocumentRepository } from '../../src/modules/signatures/infrastructure/supabase-signed-document-repository'
import { createSupabaseSignedDocumentStorage } from '../../src/modules/signatures/infrastructure/supabase-signed-document-storage'
import { drainDocumentQueueOnce, processDocumentJob } from '../../src/workers/document-worker-runtime'

const integration = process.env.DOCUMENT_WORKER_INTEGRATION === '1' ? describe : describe.skip
const sentinel = 'SIGNED_DOC_SENSITIVE_SENTINEL'

function must(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}:${error.message}`)
}

function literal(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}
function seedViaPostgres(ids: Record<string, string>, envelope: {
  ciphertext: string
  iv: string
  authTag: string
  keyVersion: number
}) {
  const connection = process.env.DB_URL
  if (!connection) throw new Error('DOCUMENT_WORKER_DB_URL_REQUIRED')
  const url = new URL(connection)
  const schema = JSON.stringify({
    fields: [{ key: 'mood', label: 'Como está?', type: 'short_text', required: true }],
  })
  const sql = `
insert into public.form_templates(id,name,active_version)
values (${literal(ids.template)}, 'Worker integration', 1);
insert into public.form_template_versions(id,template_id,version,data_classification,schema)
values (${literal(ids.templateVersion)}, ${literal(ids.template)}, 1, 'sensitive', ${literal(schema)}::jsonb);
insert into public.form_submissions(id,subject_id,template_version_id,status)
values (${literal(ids.submission)}, ${literal(ids.subject)}, ${literal(ids.templateVersion)}, 'signed');
insert into public.form_submission_versions(
  id,submission_id,version,answers,answers_ciphertext,answers_iv,answers_auth_tag,key_version,submitted_at
) values (
  ${literal(ids.submissionVersion)}, ${literal(ids.submission)}, 1, null,
  ${literal(envelope.ciphertext)}, ${literal(envelope.iv)}, ${literal(envelope.authTag)},
  ${envelope.keyVersion}, '2026-08-30T04:00:00.000Z'
);
insert into public.signature_evidence(
  id,submission_version_id,declaration_version,typed_name,signed_at,
  canonical_hash_sha256,source,document_status
) values (
  ${literal(ids.evidence)}, ${literal(ids.submissionVersion)}, 'truth-v1', 'Pessoa Sintética',
  '2026-08-30T04:00:00.000Z', '${'a'.repeat(64)}', 'staff', 'queued'
);
insert into public.document_jobs(
  id,idempotency_key,signature_evidence_id,status,kind
) values (
  ${literal(ids.job)}, ${literal(`worker-integration:${ids.submissionVersion}`)},
  ${literal(ids.evidence)}, 'queued', 'signed-form.pdf'
);
`
  const result = spawnSync('psql', ['-q', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    env: {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.replace(/^\//u, ''),
    },
  })
  if (result.status !== 0) {
    throw new Error(`DOCUMENT_WORKER_FIXTURE_FAILED:${result.stderr.trim()}`)
  }
}

integration('signed document worker integration', () => {
  it('renders one private idempotent PDF without persisting plaintext', async () => {
    const client = createServiceRoleSupabaseClient()
    const crypto = createSensitiveDataCrypto()
    const ids = {
      template: randomUUID(), templateVersion: randomUUID(), submission: randomUUID(),
      submissionVersion: randomUUID(), evidence: randomUUID(), job: randomUUID(), subject: randomUUID(),
    }
    const envelope = await crypto.encrypt(JSON.stringify({ mood: sentinel }), {
      entity: 'form_submission', id: ids.submission,
    })
    seedViaPostgres(ids, envelope)
    const idempotencyKey = `worker-integration:${ids.submissionVersion}`

    const repository = createSupabaseSignedDocumentRepository(client, crypto)
    const storage = createSupabaseSignedDocumentStorage(client)
    const queue = createQueue<{ jobId: string }>({
      name: 'documents', backend: createServerSupabaseQueueBackend(),
    })
    const logs: unknown[] = []
    const render = (jobId: string) => renderSignedDocument(jobId, {
      repository, storage, renderer: renderSignedFormPdf,
    })
    const process = (jobId: string) => processDocumentJob(jobId, {
      render, logger: (event, metadata) => logs.push({ event, metadata }),
    })

    await queue.send({
      kind: 'signed-form.pdf', idempotencyKey, correlationId: ids.job, payload: { jobId: ids.job },
    })
    await expect(drainDocumentQueueOnce({ queue, process })).resolves.toBe(1)

    const { data: jobRow, error: jobError } = await client.from('document_jobs')
      .select('status,last_error_code,completed_at').eq('id', ids.job).single()
    must(jobError, 'read job')
    const { data: evidenceRow, error: evidenceError } = await client.from('signature_evidence')
      .select('document_status,document_storage_path,document_sha256,document_byte_length').eq('id', ids.evidence).single()
    must(evidenceError, 'read evidence')
    expect(jobRow?.status).toBe('completed')
    expect(evidenceRow?.document_status).toBe('ready')
    expect(evidenceRow?.document_storage_path).toBe(`signed/${ids.evidence}/${ids.job}.pdf`)
    expect(evidenceRow?.document_sha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(evidenceRow?.document_byte_length).toBeGreaterThan(500)

    const object = await client.storage.from('signed-documents-private').download(evidenceRow!.document_storage_path!)
    must(object.error, 'download document')
    const pdfBytes = new Uint8Array(await object.data!.arrayBuffer())
    expect(Buffer.from(pdfBytes.subarray(0, 4)).toString('ascii')).toBe('%PDF')

    await queue.send({
      kind: 'signed-form.pdf', idempotencyKey, correlationId: ids.job, payload: { jobId: ids.job },
    })
    await expect(drainDocumentQueueOnce({ queue, process })).resolves.toBe(1)
    const listed = await client.storage.from('signed-documents-private').list(`signed/${ids.evidence}`)
    must(listed.error, 'list document folder')
    expect(listed.data?.map((item) => item.name)).toEqual([`${ids.job}.pdf`])

    const { data: versionRow, error: versionError } = await client.from('form_submission_versions')
      .select('answers,answers_ciphertext,answers_iv,answers_auth_tag,key_version').eq('id', ids.submissionVersion).single()
    must(versionError, 'read version')
    expect(JSON.stringify(logs)).not.toContain(sentinel)
    expect(JSON.stringify([jobRow, evidenceRow, versionRow])).not.toContain(sentinel)
    expect(versionRow?.answers).toBeNull()
  }, 30_000)
})
