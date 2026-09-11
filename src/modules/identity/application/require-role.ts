import type { AppPermission } from '../domain/permission'
import type { AppRole } from '../domain/role'

export type StaffSession = {
  userId: string
  role: AppRole
  aal: 'aal1' | 'aal2'
  active: boolean
  displayName?: string
  permissions: readonly AppPermission[]
}

export class AuthorizationError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHENTICATED'
      | 'STAFF_INACTIVE'
      | 'ROLE_FORBIDDEN'
      | 'PERMISSION_FORBIDDEN'
      | 'MFA_REQUIRED',
  ) {
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

export function hasSessionPermission(
  session: StaffSession | null,
  permission: AppPermission,
): boolean {
  return Boolean(session?.active && session.permissions.includes(permission))
}

export function authorizeStaffPermission(
  session: StaffSession | null,
  permission: AppPermission,
  options: { aal2?: boolean } = {},
): StaffSession {
  if (!session) throw new AuthorizationError('UNAUTHENTICATED')
  if (!session.active) throw new AuthorizationError('STAFF_INACTIVE')
  if (!session.permissions.includes(permission)) throw new AuthorizationError('PERMISSION_FORBIDDEN')
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
