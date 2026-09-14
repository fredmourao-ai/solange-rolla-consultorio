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

  it('applies the synthetic seed only to the dedicated staging project', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 }))
    await seedStagingProject({
      stagingRef: 'staging-ref', productionRef: 'production-ref', accessToken: 'token', seedSql: 'select 1', fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.supabase.com/v1/projects/staging-ref/database/query',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ query: 'select 1', read_only: false }) }),
    )
  })
})
