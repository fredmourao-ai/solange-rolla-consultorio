import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) { return readFileSync(join(process.cwd(), path), 'utf8') }

describe('staging cancellation policy bootstrap', () => {
  it('is staging-only, draft-safe, stable-id and bounded', () => {
    const script = source('scripts/ensure-staging-cancellation-policy.mjs')
    expect(script).toContain("APP_ENV !== 'staging'")
    expect(script).toContain('d0250000-0000-4000-8000-000000000001')
    expect(script).toContain('d0260000-0000-4000-8000-000000000001')
    expect(script).toContain('d0300000-0000-4000-8000-000000000001')
    expect(script).toMatch(/is_draft[\s\S]*true/)
    expect(script).toContain('PGCONNECT_TIMEOUT')
    expect(script).toContain('statement_timeout=')
    expect(script).toContain('timeout:')
    expect(script).not.toContain("'--db-url'")
  })

  it('is invoked by the canonical staging deployment', () => {
    const workflow = source('.github/workflows/staging-promote.yml')
    expect(workflow).toContain('ensure-staging-cancellation-policy.mjs')
    expect(workflow).toContain('STAGING_RUNTIME_ENV_FILE')
  })
})
