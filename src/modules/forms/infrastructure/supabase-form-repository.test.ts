import { describe, expect, it } from 'vitest'
import { createSupabaseFormRepository } from './supabase-form-repository'

function fakeClient() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  const rows: Record<string, unknown> = {
    form_submissions: {
      id: 'sub-1', subject_id: 'person-1', status: 'draft', template_version_id: 'tpl-v1',
    },
    form_template_versions: {
      id: 'tpl-v1', version: 1, data_classification: 'sensitive',
      schema: { fields: [{ key: 'name', type: 'short_text', required: true, label: 'Nome' }] },
    },
    form_submission_versions: {
      id: 'version-1', version: 1, answers: null,
      answers_ciphertext: 'cipher', answers_iv: 'iv', answers_auth_tag: 'tag', key_version: 1,
    },
  }

  const client = {
    from(table: string) {
      return {
        select() {
          const query = {
            eq() { return query },
            order() { return query },
            limit() { return query },
            maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
          }
          return query
        },
      }
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args })
      return {
        data: [{
          result_id: 'version-1', result_submission_id: 'sub-1',
          result_version: 1, result_submitted_at: null,
        }],
        error: null,
      }
    },
  }
  return { client, rpcCalls }
}

describe('supabase form repository', () => {
  it('loads the bound template and current encrypted version', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseFormRepository(client as never)
    const loaded = await repository.loadBound('sub-1')

    expect(loaded).toMatchObject({
      id: 'sub-1', subjectId: 'person-1', status: 'draft', currentVersionId: 'version-1',
      template: { id: 'tpl-v1', version: 1, classification: 'sensitive' },
      stored: { answersCiphertext: 'cipher', keyVersion: 1 },
    })
  })
  it('persists sensitive input through the atomic RPC without plaintext', async () => {
    const { client, rpcCalls } = fakeClient()
    const repository = createSupabaseFormRepository(client as never)

    await repository.save({
      submissionId: 'sub-1', templateVersionId: 'tpl-v1', status: 'draft',
      answersCiphertext: 'cipher-2', answersIv: 'iv-2', answersAuthTag: 'tag-2', keyVersion: 2,
    })

    expect(rpcCalls).toEqual([{
      name: 'persist_form_submission',
      args: expect.objectContaining({
        p_submission_id: 'sub-1', p_template_version_id: 'tpl-v1', p_status: 'draft',
        p_answers: null, p_answers_ciphertext: 'cipher-2', p_key_version: 2,
      }),
    }])
  })
})
