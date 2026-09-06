import { describe, expect, it } from 'vitest'
import { resolveE2eRuntime } from '../e2e/runtime-config'

describe('resolveE2eRuntime', () => {
  it('uses local server by default', () => { const r = resolveE2eRuntime({ E2E_PORT: '3456' }); expect(r.baseURL).toBe('http://127.0.0.1:3456'); expect(r.webServer).toBeTruthy(); expect(r.projectTestMatch).toBeUndefined() })
  it('allows only an explicitly allowlisted staging app and database', () => {
    const r = resolveE2eRuntime({ E2E_BASE_URL: 'https://staging.example.test/', E2E_TARGET_ENV: 'staging', APP_ENV: 'staging', DB_URL: 'postgresql://staging-db/app', E2E_ALLOWED_BASE_URL: 'https://staging.example.test', E2E_ALLOWED_DB_URL: 'postgresql://staging-db/app' })
    expect(r.baseURL).toBe('https://staging.example.test'); expect(r.webServer).toBeUndefined(); expect(r.projectTestMatch).toBe('**/real-ui-homologation.spec.ts')
  })
  it('rejects external targets whose application or database identity is not allowlisted', () => {
    expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://prod.example.test', E2E_TARGET_ENV: 'staging', APP_ENV: 'staging', DB_URL: 'postgresql://staging-db/app', E2E_ALLOWED_BASE_URL: 'https://staging.example.test', E2E_ALLOWED_DB_URL: 'postgresql://staging-db/app' })).toThrow('E2E_EXTERNAL_APP_NOT_ALLOWLISTED')
    expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://staging.example.test', E2E_TARGET_ENV: 'staging', APP_ENV: 'staging', DB_URL: 'postgresql://prod-db/app', E2E_ALLOWED_BASE_URL: 'https://staging.example.test', E2E_ALLOWED_DB_URL: 'postgresql://staging-db/app' })).toThrow('E2E_EXTERNAL_DATABASE_NOT_ALLOWLISTED')
  })
  it('rejects external production or unspecified targets', () => { expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://example.test' })).toThrow('E2E_EXTERNAL_TARGET_MUST_BE_PREVIEW_OR_STAGING'); expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://example.test', E2E_TARGET_ENV: 'staging', APP_ENV: 'production' })).toThrow('E2E_PRODUCTION_FORBIDDEN') })
})
