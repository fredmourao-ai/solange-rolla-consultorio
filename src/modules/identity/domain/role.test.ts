import { describe, expect, it } from 'vitest'
import { isAppRole } from './role'

describe('isAppRole', () => {
  it('accepts only supported roles', () => {
    expect(isAppRole('psychologist_owner')).toBe(true)
    expect(isAppRole('secretary')).toBe(true)
    expect(isAppRole('accounting')).toBe(true)
    expect(isAppRole('admin')).toBe(false)
  })
})
