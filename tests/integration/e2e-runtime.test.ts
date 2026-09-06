import { describe, expect, it } from 'vitest'
import { resolveE2eRuntime } from '../e2e/runtime-config'

describe('resolveE2eRuntime', () => {
  it('uses local server by default', () => { const r = resolveE2eRuntime({ E2E_PORT: '3456' }); expect(r.baseURL).toBe('http://127.0.0.1:3456'); expect(r.webServer).toBeTruthy() })
  it('allows an explicit staging target without local server', () => { const r = resolveE2eRuntime({ E2E_BASE_URL: 'https://staging.example.test/', E2E_TARGET_ENV: 'staging', APP_ENV: 'staging' }); expect(r.baseURL).toBe('https://staging.example.test'); expect(r.webServer).toBeUndefined() })
  it('rejects external production or unspecified targets', () => { expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://example.test' })).toThrow('E2E_EXTERNAL_TARGET_MUST_BE_PREVIEW_OR_STAGING'); expect(() => resolveE2eRuntime({ E2E_BASE_URL: 'https://example.test', E2E_TARGET_ENV: 'staging', APP_ENV: 'production' })).toThrow('E2E_PRODUCTION_FORBIDDEN') })
})
