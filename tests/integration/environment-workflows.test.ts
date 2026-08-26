import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const previewScript = path.join(process.cwd(), 'scripts/preview-env.mjs')
const stagingScript = path.join(process.cwd(), 'scripts/staging-lock.mjs')
const base = {
  SUPABASE_BRANCHING_ENABLED: 'true',
  APP_ENV: 'preview',
  GITHUB_REPOSITORY: 'example/repository',
  GITHUB_EVENT_NUMBER: '12',
  VERCEL_URL: 'preview.example.test',
  SUPABASE_PROJECT_REF: 'preview-ref',
  SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
  SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
  WHATSAPP_LIVE_ENABLED: 'false',
  NFSE_LIVE_ENABLED: 'false',
}

function run(script: string, environment: Record<string, string>) {
  return execFileSync(process.execPath, [script], {
    env: { ...process.env, ...environment },
    encoding: 'utf8',
  })
}

describe('environment workflow contracts', () => {
  it('emits a preview association only for a dedicated branch', () => {
    expect(run(previewScript, base)).toContain('"supabasePreviewRef":"preview-ref"')
  })

  it('rejects a preview association pointed at staging', () => {
    expect(() => run(previewScript, { ...base, SUPABASE_PROJECT_REF: 'staging-ref' })).toThrow(
      /dedicated Supabase preview/,
    )
  })

  it('requires explicit staging approval and distinct project refs', () => {
    expect(
      run(stagingScript, {
        APP_ENV: 'staging',
        STAGING_COMMIT_SHA: 'a'.repeat(40),
        STAGING_PROMOTION_APPROVED: 'true',
        SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
        SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
        WHATSAPP_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }),
    ).toContain('staging promotion authorized')
    expect(() =>
      run(stagingScript, {
        APP_ENV: 'staging',
        STAGING_COMMIT_SHA: 'a'.repeat(40),
        STAGING_PROMOTION_APPROVED: 'false',
        SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
        SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
        WHATSAPP_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }),
    ).toThrow(/requires STAGING_PROMOTION_APPROVED/)
  })
})
