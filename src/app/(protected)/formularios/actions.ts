'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import {
  FORM_FIELD_TYPES,
  type FormClassification,
  type FormField,
  type FormFieldType,
  type FormTemplateVersion,
} from '@/modules/forms/public'
import { serverEnv } from '@/platform/env/server'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { createCapabilityMaterial } from '@/platform/capabilities/token'
import type { Json } from '@/platform/supabase/types'

export type GenerateFormLinkState = { link?: string; error?: string }

function required(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`FORM_${key.toUpperCase()}_REQUIRED`)
  return value
}
function fieldKey(label: string, index: number): string {
  const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || `campo_${index}`
}

function readFields(formData: FormData): FormField[] {
  const fields: FormField[] = []
  for (let index = 1; index <= 5; index += 1) {
    const label = String(formData.get(`field_label_${index}`) ?? '').trim()
    if (!label) continue
    const type = String(formData.get(`field_type_${index}`) ?? 'short_text') as FormFieldType
    if (!(FORM_FIELD_TYPES as readonly string[]).includes(type)) throw new Error('FORM_FIELD_TYPE_INVALID')
    const field: FormField = { key: fieldKey(label, index), label, type, required: formData.get(`field_required_${index}`) === 'yes' }
    if (type === 'single_choice' || type === 'multi_choice') {
      const options = String(formData.get(`field_options_${index}`) ?? '').split(',').map((value) => value.trim()).filter(Boolean)
      if (options.length < 2) throw new Error('FORM_FIELD_OPTIONS_REQUIRED')
      field.options = options
    }
    fields.push(field)
  }
  if (fields.length === 0) throw new Error('FORM_AT_LEAST_ONE_FIELD_REQUIRED')
  return fields
}

async function authorized(roles: Array<'psychologist_owner' | 'secretary'>) {
  const session = await getStaffSession()
  return authorizeStaffSession(session, roles)
}

export async function createFormTemplateAction(formData: FormData) {
  await authorized(['psychologist_owner'])
  const name = required(formData, 'name')
  const classification = required(formData, 'classification') as FormClassification
  if (!['administrative', 'sensitive'].includes(classification)) throw new Error('FORM_CLASSIFICATION_INVALID')
  const fields = readFields(formData)
  const client = await createServerSupabaseClient()
  const templateId = randomUUID()
  const versionId = randomUUID()
  const rpc = client.rpc.bind(client) as unknown as (name: 'create_form_template_atomic', args: {
    p_template_id: string; p_version_id: string; p_name: string; p_classification: string; p_schema: Json
  }) => PromiseLike<{ error: { code: string } | null }>
  const { error } = await rpc('create_form_template_atomic', {
    p_template_id: templateId,
    p_version_id: versionId,
    p_name: name,
    p_classification: classification,
    p_schema: { fields } as unknown as Json,
  })
  if (error) throw new Error(`FORM_TEMPLATE_CREATE_FAILED:${error.code}`)
  redirect('/formularios?created=1')
}

function templateFromRow(row: {
  id: string
  version: number
  data_classification: string
  schema: Json
}): FormTemplateVersion {
  const raw = row.schema && typeof row.schema === 'object' && !Array.isArray(row.schema)
    ? (row.schema as Record<string, unknown>).fields
    : undefined
  const fields = Array.isArray(raw) ? raw as FormField[] : []
  return {
    id: row.id,
    version: row.version,
    classification: row.data_classification as FormClassification,
    fields,
  }
}

function localOrigin(env: ReturnType<typeof serverEnv>, requestHeaders: Headers): string {
  if (env.APP_ENV !== 'local' && env.APP_ENV !== 'test') return env.APP_URL.replace(/\/$/, '')
  const host = requestHeaders.get('host')
  if (!host) return env.APP_URL.replace(/\/$/, '')
  const proto = requestHeaders.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}
export async function generateFormLinkAction(
  _previous: GenerateFormLinkState,
  formData: FormData,
): Promise<GenerateFormLinkState> {
  try {
    await authorized(['psychologist_owner', 'secretary'])
    const personId = required(formData, 'person_id')
    const templateVersionId = required(formData, 'template_version_id')
    const hours = Number(required(formData, 'expires_hours'))
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new Error('FORM_LINK_EXPIRY_INVALID')

    const client = await createServerSupabaseClient()
    const [{ data: person }, { data: templateRow, error: templateError }] = await Promise.all([
      client.from('people').select('id').eq('id', personId).maybeSingle(),
      client.from('form_template_versions').select('id,version,data_classification,schema').eq('id', templateVersionId).maybeSingle(),
    ])
    if (!person) throw new Error('FORM_PERSON_NOT_FOUND')
    if (templateError || !templateRow) throw new Error('FORM_TEMPLATE_VERSION_NOT_FOUND')

    templateFromRow(templateRow)
    const submissionId = randomUUID()
    const expiresAt = new Date(Date.now() + hours * 3_600_000)
    const { rawToken, tokenHash } = createCapabilityMaterial()
    const rpc = client.rpc.bind(client) as unknown as (name: 'issue_form_capability_atomic', args: {
      p_submission_id: string; p_person_id: string; p_template_version_id: string;
      p_token_hash: string; p_expires_at: string
    }) => PromiseLike<{ data: string | null; error: { code: string } | null }>
    const { error: issueError } = await rpc('issue_form_capability_atomic', {
      p_submission_id: submissionId,
      p_person_id: personId,
      p_template_version_id: templateVersionId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt.toISOString(),
    })
    if (issueError) throw new Error(`FORM_LINK_CREATE_FAILED:${issueError.code}`)
    const env = serverEnv()
    const origin = localOrigin(env, await headers())
    return { link: `${origin}/c/${rawToken}?purpose=form_fill` }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'FORM_LINK_CREATE_FAILED' }
  }
}
