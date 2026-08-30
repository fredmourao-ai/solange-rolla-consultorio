import { describe, expect, it } from 'vitest'
import { buildSecurityHeaders } from './headers'

describe('buildSecurityHeaders', () => {
  it('returns a restrictive baseline and production HSTS', () => {
    const headers = buildSecurityHeaders({ environment: 'production', supabaseUrl: 'https://db.example.test' })
    const csp = headers['Content-Security-Policy']

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("connect-src 'self' https://db.example.test")
    expect(csp).not.toContain('connect-src *')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Strict-Transport-Security']).toContain('max-age=')
  })

  it('does not emit HSTS outside production', () => {
    expect(buildSecurityHeaders({ environment: 'preview', supabaseUrl: 'http://127.0.0.1:54321' })['Strict-Transport-Security']).toBeUndefined()
  })
})
