function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' && url.pathname !== '') return null
    return url.origin.toLowerCase()
  } catch {
    return null
  }
}

export function isTrustedOrigin(origin: string | null | undefined, allowedOrigins: readonly string[]): boolean {
  const candidate = origin ? canonicalOrigin(origin) : null
  if (!candidate) return false
  return allowedOrigins.some((allowed) => canonicalOrigin(allowed) === candidate)
}

export function requireTrustedOrigin(request: Request, allowedOrigins: readonly string[]): string {
  const origin = request.headers.get('origin')
  if (!isTrustedOrigin(origin, allowedOrigins)) throw new Error('TRUSTED_ORIGIN_REQUIRED')
  return canonicalOrigin(origin as string) as string
}
