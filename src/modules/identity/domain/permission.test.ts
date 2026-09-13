import { describe, expect, it } from 'vitest'
import { APP_PERMISSIONS, isAppPermission } from './permission'

describe('permission catalog', () => {
  it('uses unique stable permission keys', () => {
    expect(new Set(APP_PERMISSIONS).size).toBe(APP_PERMISSIONS.length)
    expect(APP_PERMISSIONS).toContain('patients.update')
    expect(APP_PERMISSIONS).toContain('appointments.create')
    expect(APP_PERMISSIONS).toContain('clinical.read')
    expect(APP_PERMISSIONS).toContain('permissions.manage')
  })

  it('recognizes the collaboration tasks permission keys granted by the database', () => {
    expect(APP_PERMISSIONS).toContain('tasks.read')
    expect(APP_PERMISSIONS).toContain('tasks.create')
    expect(APP_PERMISSIONS).toContain('tasks.update')
    expect(APP_PERMISSIONS).toContain('tasks.assign')
  })

  it('rejects unknown permissions', () => {
    expect(isAppPermission('appointments.create')).toBe(true)
    expect(isAppPermission('clinical.god_mode')).toBe(false)
  })
})
