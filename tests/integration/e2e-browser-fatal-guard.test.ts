import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isExpectedAuthLogoutAbort,
  isExpectedAuthCredentialResponse,
  isExpectedClientErrorConsole,
  isExpectedDownloadAbort,
  isExpectedNextActionAbort,
  isExpectedNextPrefetchAbort,
} from '../e2e/fixtures'

const e2eDir = path.join(process.cwd(), 'tests/e2e')
const fixture = readFileSync(path.join(e2eDir, 'fixtures.ts'), 'utf8')
const specs = readdirSync(e2eDir).filter((name) => name.endsWith('.spec.ts'))

describe('E2E browser fatal guard', () => {
  it('routes every Playwright spec through the guarded page fixture', () => {
    expect(specs.length).toBeGreaterThan(0)
    for (const name of specs) {
      const source = readFileSync(path.join(e2eDir, name), 'utf8')
      expect(source, name).toContain("from './fixtures'")
      expect(source, name).not.toContain("from '@playwright/test'")
    }
  })

  it('allowlists only documented benign browser aborts and intentional client 4xx errors', () => {
    expect(isExpectedNextPrefetchAbort('GET', 'http://127.0.0.1:3400/agenda?_rsc=abc', 'net::ERR_ABORTED')).toBe(true)
    expect(isExpectedNextPrefetchAbort('GET', 'http://127.0.0.1:3400/agenda', 'net::ERR_ABORTED')).toBe(false)
    expect(isExpectedNextActionAbort('POST', 'net::ERR_ABORTED', { accept: 'text/x-component', 'next-action': 'abc' })).toBe(true)
    expect(isExpectedNextActionAbort('POST', 'net::ERR_ABORTED', { accept: 'text/x-component' })).toBe(false)
    expect(isExpectedDownloadAbort('GET', 'http://127.0.0.1:3400/relatorios/exportar?format=pdf', 'net::ERR_ABORTED')).toBe(true)
    expect(isExpectedDownloadAbort('GET', 'http://127.0.0.1:3400/agenda', 'net::ERR_ABORTED')).toBe(false)
    expect(isExpectedAuthLogoutAbort('POST', 'http://127.0.0.1:57321/auth/v1/logout?scope=local', 'net::ERR_ABORTED')).toBe(true)
    expect(isExpectedAuthLogoutAbort('POST', 'http://127.0.0.1:57321/auth/v1/token', 'net::ERR_ABORTED')).toBe(false)
    const intentional4xx = new Set(['http://127.0.0.1:3400/clinico/synthetic-person-1'])
    expect(isExpectedClientErrorConsole('Failed to load resource: the server responded with a status of 404 (Not Found)', 'http://127.0.0.1:3400/clinico/synthetic-person-1', intentional4xx)).toBe(true)
    expect(isExpectedClientErrorConsole('Failed to load resource: the server responded with a status of 404 (Not Found)', 'http://127.0.0.1:3400/_next/missing.js', intentional4xx)).toBe(false)
    expect(isExpectedAuthCredentialResponse('POST', 'http://127.0.0.1:54321/auth/v1/token?grant_type=password', 400)).toBe(true)
    expect(isExpectedAuthCredentialResponse('POST', 'http://127.0.0.1:54321/rest/v1/profiles', 400)).toBe(false)
    expect(isExpectedClientErrorConsole('Failed to load resource: the server responded with a status of 400 (Bad Request)', '', new Set(), 1)).toBe(true)
  })

  it('fails tests on unhandled browser and server runtime errors', () => {
    expect(fixture).toContain("page.on('pageerror'")
    expect(fixture).toContain("page.on('requestfailed'")
    expect(fixture).toContain("message.type() !== 'error'")
    expect(fixture).toContain("page.on('response'")
    expect(fixture).toContain('status >= 500')
    expect(fixture).toContain("expect(failures, 'unexpected browser/runtime failures').toEqual([])")
  })
})
