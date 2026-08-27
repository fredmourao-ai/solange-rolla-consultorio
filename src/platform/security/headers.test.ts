import { describe, expect, it } from 'vitest'
import { buildSecurityHeaders } from './headers'

describe('buildSecurityHeaders', () => {
  it('returns a restrictive baseline and production HSTS', () => {
    const headers = buildSecurityHeaders({ environment: 'production' })

    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Strict-Transport-Security']).toContain('max-age=')
  })

  it('does not emit HSTS outside production', () => {
    expect(buildSecurityHeaders({ environment: 'preview' })['Strict-Transport-Security']).toBeUndefined()
  })
})
