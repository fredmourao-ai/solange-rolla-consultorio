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
        EMAIL_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }).ok,
    ).toBe(true)
  })

  it('accepts the test environment without remote credentials', () => {
    expect(
      run({
        APP_ENV: 'test',
        WHATSAPP_LIVE_ENABLED: 'false',
        EMAIL_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }).ok,
    ).toBe(true)
  })

  it('rejects live providers in local development', () => {
    const result = run({
      APP_ENV: 'local',
      WHATSAPP_LIVE_ENABLED: 'true',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('live providers must be disabled')
  })

  it('rejects live email outside production the same way as live WhatsApp', () => {
    const result = run({
      APP_ENV: 'local',
      WHATSAPP_LIVE_ENABLED: 'false',
      EMAIL_LIVE_ENABLED: 'true',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('live providers must be disabled')
  })

  it('rejects staging configured with the production project ref', () => {
    const result = run({
      APP_ENV: 'staging',
      SUPABASE_PROJECT_REF: 'production-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://production-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_staging',
      SUPABASE_SECRET_KEY: 'sb_secret_staging',
      WHATSAPP_LIVE_ENABLED: 'false',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('must not use the production Supabase project')
  })

  it('rejects live providers outside production and rejects enabled live flags in production', () => {
    const staging = run({
      APP_ENV: 'preview',
      SUPABASE_PROJECT_REF: 'preview-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      SUPABASE_ALLOWED_PROJECT_REFS: 'preview-ref,staging-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_preview',
      SUPABASE_SECRET_KEY: 'sb_secret_preview',
      WHATSAPP_LIVE_ENABLED: 'true',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })
    const production = run({
      APP_ENV: 'production',
      SUPABASE_PROJECT_REF: 'production-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://production-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_production',
      SUPABASE_SECRET_KEY: 'sb_secret_production',
      WHATSAPP_LIVE_ENABLED: 'true',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(staging.ok).toBe(false)
    expect(staging.output).toContain('live providers must be disabled')
    expect(production.ok).toBe(false)
    expect(production.output).toContain('go-live gate')
  })

  it('rejects a remote URL that points at a different project ref', () => {
    const result = run({
      APP_ENV: 'staging',
      SUPABASE_PROJECT_REF: 'staging-ref',
      SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://production-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_staging',
      SUPABASE_SECRET_KEY: 'sb_secret_staging',
      WHATSAPP_LIVE_ENABLED: 'false',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('URL must identify SUPABASE_PROJECT_REF')
  })

  it('rejects preview using the staging project even when it is allowlisted', () => {
    const result = run({
      APP_ENV: 'preview',
      SUPABASE_PROJECT_REF: 'staging-ref',
      SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
      SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
      SUPABASE_ALLOWED_PROJECT_REFS: 'staging-ref,preview-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_preview',
      SUPABASE_SECRET_KEY: 'sb_secret_preview',
      WHATSAPP_LIVE_ENABLED: 'false',
      EMAIL_LIVE_ENABLED: 'false',
      NFSE_LIVE_ENABLED: 'false',
    })

    expect(result.ok).toBe(false)
    expect(result.output).toContain('dedicated preview Supabase project')
  })
})
