import { describe, expect, it } from 'vitest'
import {
  authorizeStaffPermission,
  hasSessionPermission,
  type StaffSession,
} from './require-role'

const secretary: StaffSession = {
  userId: 'user-1',
  role: 'secretary',
  aal: 'aal1',
  active: true,
  displayName: 'Secretaria',
  permissions: ['patients.read', 'appointments.read'],
}

describe('routine permission authorization', () => {
  it('allows only effective permissions in the session', () => {
    expect(hasSessionPermission(secretary, 'patients.read')).toBe(true)
    expect(hasSessionPermission(secretary, 'patients.update')).toBe(false)
    expect(() => authorizeStaffPermission(secretary, 'patients.update')).toThrow(
      'PERMISSION_FORBIDDEN',
    )
  })

  it('rejects inactive staff even when the permission is present', () => {
    expect(
      hasSessionPermission({ ...secretary, active: false }, 'patients.read'),
    ).toBe(false)
    expect(() =>
      authorizeStaffPermission({ ...secretary, active: false }, 'patients.read'),
    ).toThrow('STAFF_INACTIVE')
  })

  it('requires AAL2 when the protected action requests it', () => {
    const owner: StaffSession = {
      userId: 'owner-1',
      role: 'psychologist_owner',
      aal: 'aal1',
      active: true,
      permissions: ['permissions.manage'],
    }

    expect(() =>
      authorizeStaffPermission(owner, 'permissions.manage', { aal2: true }),
    ).toThrow('MFA_REQUIRED')

    expect(
      authorizeStaffPermission({ ...owner, aal: 'aal2' }, 'permissions.manage', { aal2: true }),
    ).toMatchObject({ userId: 'owner-1' })
  })

  it('rejects unauthenticated sessions', () => {
    expect(() => authorizeStaffPermission(null, 'patients.read')).toThrow('UNAUTHENTICATED')
  })
})
