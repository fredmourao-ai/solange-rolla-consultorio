import { describe, expect, it } from 'vitest'
import { resolveE2eRuntime } from '../e2e/runtime-config'

describe('resolveE2eRuntime', () => {
  it('starts the local web server by default', () => {
    const runtime = resolveE2eRuntime({ E2E_PORT: '3456' })
    expect(runtime.baseURL).toBe('http://127.0.0.1:3456')
    expect(runtime.webServer?.url).toBe('http://127.0.0.1:3456')
  })

  it('uses an already deployed environment without starting a local server', () => {
    const runtime = resolveE2eRuntime({ E2E_BASE_URL: 'https://homologacao.example.test/' })
    expect(runtime.baseURL).toBe('https://homologacao.example.test')
    expect(runtime.webServer).toBeUndefined()
  })
})
