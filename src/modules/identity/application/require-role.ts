import type { AppRole } from '../domain/role'

export type StaffSession = {
  userId: string
  role: AppRole
  aal: 'aal1' | 'aal2'
  active: boolean
  displayName?: string
}

export class AuthorizationError extends Error {
  constructor(public readonly code: 'UNAUTHENTICATED' | 'STAFF_INACTIVE' | 'ROLE_FORBIDDEN' | 'MFA_REQUIRED') {
    super(code)
    this.name = 'AuthorizationError'
  }
}

export function authorizeStaffSession(
  session: StaffSession | null,
  allowed: readonly AppRole[],
  options: { aal2?: boolean } = {},
): StaffSession {
  if (!session) throw new AuthorizationError('UNAUTHENTICATED')
  if (!session.active) throw new AuthorizationError('STAFF_INACTIVE')
  if (!allowed.includes(session.role)) throw new AuthorizationError('ROLE_FORBIDDEN')
  if (options.aal2 && session.aal !== 'aal2') throw new AuthorizationError('MFA_REQUIRED')
  return session
}

export async function requireRoleForTest(
  session: StaffSession | null,
  allowed: readonly AppRole[],
  options: { aal2?: boolean } = {},
): Promise<StaffSession> {
  return authorizeStaffSession(session, allowed, options)
}

export type SessionProvider = () => Promise<StaffSession | null>

export function requireRole(
  getSession: SessionProvider,
  allowed: readonly AppRole[],
  options: { aal2?: boolean } = {},
): Promise<StaffSession> {
  return getSession().then((session) => authorizeStaffSession(session, allowed, options))
}
