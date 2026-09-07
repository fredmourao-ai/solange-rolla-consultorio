import { describe, expect, it, vi } from 'vitest'
import { assertExternalBuild, resolveE2eRuntime } from '../e2e/runtime-config'

const sha = 'a'.repeat(40)
const staging = { E2E_BASE_URL: 'https://staging.example.test/', E2E_TARGET_ENV: 'staging', APP_ENV: 'staging', DB_URL: 'postgresql://staging-db/app', E2E_ALLOWED_BASE_URL: 'https://staging.example.test', E2E_ALLOWED_DB_URL: 'postgresql://staging-db/app', E2E_EXPECTED_BUILD_SHA: sha }

describe('resolveE2eRuntime', () => {
  it('uses local server by default', () => { const r = resolveE2eRuntime({ E2E_PORT: '3456' }); expect(r.baseURL).toBe('http://127.0.0.1:3456'); expect(r.webServer).toBeTruthy(); expect(r.projectTestMatch).toBeUndefined(); expect(r.expectedBuildSha).toBeUndefined() })
  it('allows only an explicitly allowlisted staging app, database and candidate SHA', () => { const r = resolveE2eRuntime(staging); expect(r.baseURL).toBe('https://staging.example.test'); expect(r.webServer).toBeUndefined(); expect(r.projectTestMatch).toBe('**/real-ui-homologation.spec.ts'); expect(r.expectedBuildSha).toBe(sha) })
  it('rejects external targets whose application or database identity is not allowlisted', () => {
    expect(() => resolveE2eRuntime({ ...staging, E2E_BASE_URL: 'https://prod.example.test' })).toThrow('E2E_EXTERNAL_APP_NOT_ALLOWLISTED')
    expect(() => resolveE2eRuntime({ ...staging, DB_URL: 'postgresql://prod-db/app' })).toThrow('E2E_EXTERNAL_DATABASE_NOT_ALLOWLISTED')
  })
  it('rejects external production, unspecified targets or missing candidate SHA', () => {
    expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://example.test' })).toThrow('E2E_EXTERNAL_TARGET_MUST_BE_PREVIEW_OR_STAGING')
    expect(() => resolveE2eRuntime({ ...staging, APP_ENV: 'production' })).toThrow('E2E_PRODUCTION_FORBIDDEN')
    expect(() => resolveE2eRuntime({ ...staging, E2E_EXPECTED_BUILD_SHA: '' })).toThrow('E2E_EXPECTED_BUILD_SHA_REQUIRED')
  })
  it('fails closed when health reports a different deployed SHA', async () => {
    const runtime = resolveE2eRuntime(staging)
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildSha: 'b'.repeat(40) }) })
    await expect(assertExternalBuild(runtime, fetcher as unknown as typeof fetch)).rejects.toThrow('E2E_DEPLOYED_SHA_MISMATCH')
  })
  it('accepts the exact candidate SHA reported by health', async () => {
    const runtime = resolveE2eRuntime(staging)
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildSha: sha }) })
    await expect(assertExternalBuild(runtime, fetcher as unknown as typeof fetch)).resolves.toBeUndefined()
  })
})
