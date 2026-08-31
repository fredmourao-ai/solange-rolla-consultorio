export type SecurityEnvironment = 'local' | 'test' | 'preview' | 'staging' | 'production'

function connectSources(supabaseUrl?: string): string {
  const sources = ["'self'"]
  if (!supabaseUrl) return sources.join(' ')
  try {
    const url = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return sources.join(' ')
    sources.push(url.origin)
    const websocket = new URL(url.origin)
    websocket.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    sources.push(websocket.origin)
  } catch {}
  return [...new Set(sources)].join(' ')
}

export function buildSecurityHeaders({ environment, supabaseUrl }: { environment: SecurityEnvironment; supabaseUrl?: string }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': [
      "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
      "form-action 'self'", "img-src 'self' data:", "font-src 'self'", "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'", `connect-src ${connectSources(supabaseUrl)}`,
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Frame-Options': 'DENY',
  }
  if (environment === 'production') headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  return headers
}
