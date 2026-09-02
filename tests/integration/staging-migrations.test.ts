import { describe, expect, it, vi } from 'vitest'
import {
  applyPendingMigrations,
  buildMigrationQuery,
} from '../../scripts/apply-staging-migrations.mjs'

describe('staging migration management API', () => {
  it('records the local migration version in the same transaction', () => {
    const sql = buildMigrationQuery({
      version: '20260902014500',
      name: 'people_accounting_view_rls',
      query: 'select 1;',
    })

    expect(sql).toContain('begin;')
    expect(sql).toContain('select 1;')
    expect(sql).toContain('supabase_migrations.schema_migrations')
    expect(sql).toContain("'20260902014500'")
    expect(sql).toContain("'people_accounting_view_rls'")
    expect(sql).toContain('commit;')
  })

  it('applies only missing migrations and verifies history', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { version: '20260830015300', name: 'forms_document_worker_privileges' },
      ]), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { version: '20260830015300', name: 'forms_document_worker_privileges' },
        { version: '20260902014500', name: 'people_accounting_view_rls' },
      ]), { status: 201 }))

    const result = await applyPendingMigrations({
      projectRef: 'staging-ref',
      accessToken: 'token',
      migrations: [
        { version: '20260830015300', name: 'forms_document_worker_privileges', query: 'select 0;' },
        { version: '20260902014500', name: 'people_accounting_view_rls', query: 'select 1;' },
      ],
      fetchImpl: fetchMock,
    })

    expect(result.applied).toEqual(['20260902014500'])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
