export type SecurityEnvironment = 'local' | 'test' | 'preview' | 'staging' | 'production'

export function buildSecurityHeaders({ environment }: { environment: SecurityEnvironment }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      // Next.js emits a small inline hydration bootstrap; external scripts remain blocked.
      "script-src 'self' 'unsafe-inline'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Frame-Options': 'DENY',
  }

  if (environment === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }

  return headers
}
