import 'server-only'
import type { AppRole } from '../domain/role'

export type StaffDirectoryEntry = {
  userId: string
  displayName: string | null
}

export type StaffProfile = {
  userId: string
  role: AppRole
  active: boolean
}

export type StaffDirectoryRepository = {
  listActiveByRole(role: AppRole): Promise<StaffDirectoryEntry[]>
  findByUserId(userId: string): Promise<StaffProfile | null>
}

export function listActiveStaffByRole(
  role: AppRole,
  repository: StaffDirectoryRepository,
): Promise<StaffDirectoryEntry[]> {
  return repository.listActiveByRole(role)
}

export async function isActiveStaffWithRole(
  userId: string,
  role: AppRole,
  repository: Pick<StaffDirectoryRepository, 'findByUserId'>,
): Promise<boolean> {
  const profile = await repository.findByUserId(userId)
  return Boolean(profile && profile.active && profile.role === role)
}
