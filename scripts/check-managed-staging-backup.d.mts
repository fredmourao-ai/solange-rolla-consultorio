export type ManagedBackupPayload = {
  backups?: Array<{
    status?: string
    inserted_at?: string
    is_physical_backup?: boolean
  }>
  physical_backup_data?: {
    latest_physical_backup_date_unix?: number
  }
}

export type ManagedBackupResult = {
  ageSeconds: number
  physical: boolean
  insertedAt: string
}

export function selectLatestCompletedBackup(
  payload: ManagedBackupPayload,
): { at: number; physical: boolean } | null

export function checkManagedStagingBackup(options: {
  runtimeProjectRef?: string
  stagingProjectRef?: string
  accessToken?: string
  maxAgeSeconds?: number
  now?: number
  fetchImpl?: typeof fetch
}): Promise<ManagedBackupResult>