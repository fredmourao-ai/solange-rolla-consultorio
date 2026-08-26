export const CAPABILITY_COOKIE_NAME = 'solange_capability'

export function capabilityCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(1, Math.min(600, Math.floor(maxAgeSeconds))),
  }
}
