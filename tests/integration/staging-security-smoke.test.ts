import { describe, expect, it } from 'vitest'
import { buildSecuritySmokeQuery } from '../../scripts/verify-staging-accounting-rls.mjs'

describe('staging accounting RLS security smoke', () => {
  it('checks unauthorized, accounting, and secretary access inside a rollback transaction', () => {
    const sql = buildSecuritySmokeQuery()

    expect(sql).toContain('begin;')
    expect(sql).toContain('set local role authenticated;')
    expect(sql).toContain('no-profile authenticated subject can read accounting view')
    expect(sql).toContain('accounting cannot read minimum accounting view')
    expect(sql).toContain('secretary can read accounting-only view')
    expect(sql).toContain('rollback;')
  })
})
