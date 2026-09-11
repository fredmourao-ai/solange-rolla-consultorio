import { describe, expect, it } from 'vitest'
import { isAppPermission, isAppRole } from '@/modules/identity/public'

describe('users and access action inputs', () => {
  it('accepts only known staff roles', () => {
    expect(isAppRole('secretary')).toBe(true)
    expect(isAppRole('psychologist_owner')).toBe(true)
    expect(isAppRole('administrator')).toBe(false)
  })

  it('accepts only catalogued permission keys', () => {
    expect(isAppPermission('appointments.create')).toBe(true)
    expect(isAppPermission('clinical.read')).toBe(true)
    expect(isAppPermission('clinical.read.anything')).toBe(false)
  })
})
