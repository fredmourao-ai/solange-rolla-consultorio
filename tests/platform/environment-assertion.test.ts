import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const script = path.join(process.cwd(), 'scripts/assert-environment.mjs')

function run(environment: Record<string, string>) {
  try {
    execFileSync(process.execPath, [script], {
      env: { ...process.env, ...environment },
      stdio: 'pipe',
    })
    return { ok: true, output: '' }
  } catch (error) {
    const result = error as { stdout?: Buffer; stderr?: Buffer }
    return {
      ok: false,
      output: `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`,
    }
  }
}

describe('environment isolation assertion', () => {
  it('accepts local development without a remote project ref', () => {
    expect(
      run({
        APP_ENV: 'local',
        WHATSAPP_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }).ok,
    ).toBe(true)
  })

  it('rejects staging configured with the production project ref', () => {
    const result = run({
      APP_ENV: 'staging',
      SUPABASE_PROJECT_REF: 'production-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
      WHATSAPP_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('must not use the production Supabase project')
  })

  it('rejects live providers outside production and rejects enabled live flags in production', () => {
    const staging = run({
      APP_ENV: 'preview',
      SUPABASE_PROJECT_REF: 'preview-ref',
      WHATSAPP_LIVE_ENABLED: 'true',
      NFSE_LIVE_ENABLED: 'false',
    })
    const production = run({
      APP_ENV: 'production',
      SUPABASE_PROJECT_REF: 'production-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      WHATSAPP_LIVE_ENABLED: 'true',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(staging.ok).toBe(false)
    expect(staging.output).toContain('live providers must be disabled')
    expect(production.ok).toBe(false)
    expect(production.output).toContain('go-live gate')
  })
})
