import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { Database, Json } from '../../../platform/supabase/types'
import type { FormClassification, FormField, FormTemplateVersion } from '../domain/form-schema'
import type { StoredFormSubmission } from '../application/read-submission'
import type { FormSubmissionStatus } from '../application/start-submission'

type FormClient = ReturnType<typeof createServiceRoleSupabaseClient>

type BoundFormSubmission = {
  id: string
  subjectId: string
  status: FormSubmissionStatus
  template: FormTemplateVersion
  currentVersionId?: string
  stored: StoredFormSubmission
}

function parseTemplate(row: {
  id: string
  version: number
  data_classification: string
  schema: Json
}): FormTemplateVersion {
  const schema = row.schema as { fields?: FormField[] }
  if (!Array.isArray(schema.fields)) throw new Error('FORM_TEMPLATE_SCHEMA_INVALID')
  if (!['administrative', 'sensitive'].includes(row.data_classification)) {
    throw new Error('FORM_CLASSIFICATION_INVALID')
  }
  return {
    id: row.id,
    version: row.version,
    classification: row.data_classification as FormClassification,
    fields: schema.fields,
  }
}
async function loadBoundWithClient(
  client: FormClient,
  submissionId: string,
): Promise<BoundFormSubmission | null> {
  const { data: submission, error: submissionError } = await client
    .from('form_submissions')
    .select('id,subject_id,status,template_version_id')
    .eq('id', submissionId)
    .maybeSingle()
  if (submissionError) throw new Error('FORM_SUBMISSION_LOOKUP_FAILED')
  if (!submission) return null

  const { data: templateRow, error: templateError } = await client
    .from('form_template_versions')
    .select('id,version,data_classification,schema')
    .eq('id', submission.template_version_id)
    .maybeSingle()
  if (templateError || !templateRow) throw new Error('FORM_TEMPLATE_LOOKUP_FAILED')
  const template = parseTemplate(templateRow)

  const { data: versionRow, error: versionError } = await client
    .from('form_submission_versions')
    .select('id,version,answers,answers_ciphertext,answers_iv,answers_auth_tag,key_version')
    .eq('submission_id', submission.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (versionError) throw new Error('FORM_SUBMISSION_VERSION_LOOKUP_FAILED')
  return {
    id: submission.id,
    subjectId: submission.subject_id,
    status: submission.status as FormSubmissionStatus,
    template,
    currentVersionId: versionRow?.id,
    stored: {
      id: submission.id,
      templateVersionId: template.id,
      classification: template.classification,
      status: submission.status as FormSubmissionStatus,
      answers: versionRow?.answers && typeof versionRow.answers === 'object' && !Array.isArray(versionRow.answers)
        ? versionRow.answers as Record<string, unknown>
        : undefined,
      answersCiphertext: versionRow?.answers_ciphertext ?? undefined,
      answersIv: versionRow?.answers_iv ?? undefined,
      answersAuthTag: versionRow?.answers_auth_tag ?? undefined,
      keyVersion: versionRow?.key_version ?? undefined,
    },
  }
}

function asJson(value: unknown): Json | null {
  return value === undefined ? null : value as Json
}

async function persist(
  client: FormClient,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const args: Database['public']['Functions']['persist_form_submission']['Args'] = {
    p_submission_id: String(input.submissionId ?? ''),
    p_template_version_id: String(input.templateVersionId ?? ''),
    p_status: String(input.status ?? ''),
    p_answers: asJson(input.answers),
    p_answers_ciphertext: input.answersCiphertext ? String(input.answersCiphertext) : undefined,
    p_answers_iv: input.answersIv ? String(input.answersIv) : undefined,
    p_answers_auth_tag: input.answersAuthTag ? String(input.answersAuthTag) : undefined,
    p_key_version: typeof input.keyVersion === 'number' ? input.keyVersion : undefined,
  }
  const { data, error } = await client.rpc('persist_form_submission', args)
  const row = data?.[0]
  if (error || !row) throw new Error('FORM_SUBMISSION_PERSIST_FAILED')
  return {
    submissionId: row.result_submission_id,
    submissionVersionId: row.result_id,
    version: row.result_version,
    submittedAt: row.result_submitted_at,
    status: input.status,
  }
}

export function createSupabaseFormRepository(
  client: FormClient = createServiceRoleSupabaseClient(),
) {
  return {
    loadBound: (submissionId: string) => loadBoundWithClient(client, submissionId),
    async findCurrent(submissionId: string) {
      const bound = await loadBoundWithClient(client, submissionId)
      return bound?.stored ?? null
    },
    save: (input: Record<string, unknown>) => persist(client, input),
    submit: (input: Record<string, unknown>) => persist(client, input),
  }
}

export type { BoundFormSubmission }
