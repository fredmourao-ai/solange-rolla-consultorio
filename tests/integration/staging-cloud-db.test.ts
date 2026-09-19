import { describe, expect, it, vi } from 'vitest'
import { queryStagingProject } from '../../scripts/query-staging-project.mjs'
import { seedStagingProject } from '../../scripts/seed-staging-project.mjs'

describe('staging cloud database helpers', () => {
  it('queries the dedicated staging project through the Supabase Management API', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ value: 'ok' }]), { status: 200 }))
    const result = await queryStagingProject({
      projectRef: 'staging-ref', accessToken: 'token', query: 'select 1 as value', fetchImpl,
    })
    expect(result).toEqual([{ value: 'ok' }])
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.supabase.com/v1/projects/staging-ref/database/query',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('refuses to seed when staging and production project refs are equal', async () => {
    await expect(seedStagingProject({
      stagingRef: 'same-ref', productionRef: 'same-ref', accessToken: 'token', seedSql: 'select 1',
    })).rejects.toThrow('STAGING_SEED_PRODUCTION_FORBIDDEN')
  })

  it('applies the synthetic seed without the local auth credential fixture', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response('[]', { status: 200 })
    })
    const seedSql = [
      '-- BEGIN LOCAL_AUTH_FIXTURE',
      "insert into auth.users (encrypted_password) values ('local-only');",
      '-- END LOCAL_AUTH_FIXTURE',
      'select 1;',
    ].join('\n')
    await seedStagingProject({
      stagingRef: 'staging-ref',
      productionRef: 'production-ref',
      accessToken: 'token',
      seedSql,
      fetchImpl,
    })
    const [, options] = fetchImpl.mock.calls[0]
    const body = JSON.parse(String(options?.body))
    expect(body.read_only).toBe(false)
    expect(body.query).toContain('select 1;')
    expect(body.query).not.toContain('auth.users')
    expect(body.query).not.toContain('encrypted_password')
  })

  it('refuses remote staging seed when the local-auth fixture markers are absent', async () => {
    await expect(seedStagingProject({
      stagingRef: 'staging-ref',
      productionRef: 'production-ref',
      accessToken: 'token',
      seedSql: 'select 1',
    })).rejects.toThrow('STAGING_SEED_AUTH_FIXTURE_MARKERS_REQUIRED')
  })
})