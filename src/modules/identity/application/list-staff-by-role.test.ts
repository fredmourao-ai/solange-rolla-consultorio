import { describe, expect, it, vi } from 'vitest'
import {
  isActiveStaffWithRole,
  listActiveStaffByRole,
  type StaffDirectoryRepository,
} from './list-staff-by-role'

describe('listActiveStaffByRole', () => {
  it('delegates to the repository for the requested role', async () => {
    const entries = [{ userId: 'user-1', displayName: 'Secretária' }]
    const repository: StaffDirectoryRepository = {
      listActiveByRole: vi.fn().mockResolvedValue(entries),
      findByUserId: vi.fn(),
    }

    const result = await listActiveStaffByRole('secretary', repository)

    expect(repository.listActiveByRole).toHaveBeenCalledWith('secretary')
    expect(result).toBe(entries)
  })
})

describe('isActiveStaffWithRole', () => {
  it('is true for an active user with the exact matching role', async () => {
    const repository: StaffDirectoryRepository = {
      listActiveByRole: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'secretary', active: true }),
    }

    await expect(isActiveStaffWithRole('user-1', 'secretary', repository)).resolves.toBe(true)
  })

  it('is false when the user has a different role', async () => {
    const repository: StaffDirectoryRepository = {
      listActiveByRole: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'psychologist_owner', active: true }),
    }

    await expect(isActiveStaffWithRole('user-1', 'secretary', repository)).resolves.toBe(false)
  })

  it('is false when the user is inactive', async () => {
    const repository: StaffDirectoryRepository = {
      listActiveByRole: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'secretary', active: false }),
    }

    await expect(isActiveStaffWithRole('user-1', 'secretary', repository)).resolves.toBe(false)
  })

  it('is false when the user does not exist', async () => {
    const repository: StaffDirectoryRepository = {
      listActiveByRole: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue(null),
    }

    await expect(isActiveStaffWithRole('missing', 'secretary', repository)).resolves.toBe(false)
  })
})
