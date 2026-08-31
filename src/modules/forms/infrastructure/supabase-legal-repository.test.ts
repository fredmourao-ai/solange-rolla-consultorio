import { describe, expect, it } from 'vitest'
import { createSupabaseLegalRepository } from './supabase-legal-repository'

function fakeClient() {
  const inserts: Record<string, unknown>[] = []
  const rows: Record<string, unknown> = {
    legal_documents: { id: 'doc-1', key: 'truthfulness_declaration' },
    legal_document_versions: {
      id: 'doc-v2', document_id: 'doc-1', version: 2, content: 'Declaro que as informações são verdadeiras.',
      content_hash_sha256: 'a'.repeat(64), effective_from: '2026-08-01T00:00:00.000Z', supersedes_id: 'doc-v1', is_draft: false,
    },
  }
  const client = {
    from(table: string) {
      return {
        select() {
          const query = {
            eq() { return query }, lte() { return query }, order() { return query }, limit() { return query },
            maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
          }
          return query
        },
        insert: async (row: Record<string, unknown>) => { inserts.push(row); return { data: row, error: null } },
      }
    },
  }
  return { client, inserts }
}
describe('supabase legal repository', () => {
  it('loads the latest active published legal document', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseLegalRepository('cap-1', client as never)
    await expect(repository.findActive('truthfulness_declaration')).resolves.toMatchObject({
      id: 'doc-v2', key: 'truthfulness_declaration', version: 2,
      contentHash: 'a'.repeat(64), supersedesId: 'doc-v1',
    })
  })

  it('treats an already-recorded acceptance as an idempotent success', async () => {
    const repository = createSupabaseLegalRepository('cap-1', {
      from: () => ({ insert: async () => ({ error: { code: '23505', message: 'duplicate' } }) }),
    } as never)
    const acceptance = {
      personId: 'person-1', documentVersionId: 'doc-v2', contentHash: 'a'.repeat(64),
      acceptedAt: '2026-08-29T01:00:00.000Z', channel: 'capability' as const,
    }
    await expect(repository.insert(acceptance)).resolves.toEqual(acceptance)
  })

  it('records acceptance with the capability id without changing domain data', async () => {
    const { client, inserts } = fakeClient()
    const repository = createSupabaseLegalRepository('cap-1', client as never)
    const acceptance = {
      personId: 'person-1', documentVersionId: 'doc-v2', contentHash: 'a'.repeat(64),
      acceptedAt: '2026-08-29T01:00:00.000Z', channel: 'capability' as const,
    }
    await expect(repository.insert(acceptance)).resolves.toEqual(acceptance)
    expect(inserts).toEqual([expect.objectContaining({
      person_id: 'person-1', document_version_id: 'doc-v2', capability_id: 'cap-1',
      content_hash_sha256: 'a'.repeat(64), channel: 'capability',
    })])
  })
})
