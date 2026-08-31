export const CAPABILITY_COOKIE_NAME = 'solange_capability'

export function capabilityCookieOptions(maxAgeSeconds: number, options: { secure?: boolean } = {}) {
  return {
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(1, Math.min(600, Math.floor(maxAgeSeconds))),
  }
}
