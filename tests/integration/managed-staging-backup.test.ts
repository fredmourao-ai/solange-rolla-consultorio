import { describe, expect, it } from 'vitest'
import {
  checkManagedStagingBackup,
  selectLatestCompletedBackup,
} from '../../scripts/check-managed-staging-backup.mjs'

describe('managed staging backup provenance', () => {
  it('accepts a fresh completed backup for the exact runtime project', async () => {
    const now = Date.parse('2026-09-19T01:00:00Z')
    const fetchImpl = async () => new Response(JSON.stringify({
      backups: [
        { status: 'COMPLETED', inserted_at: '2026-09-18T23:30:00Z', is_physical_backup: true },
        { status: 'FAILED', inserted_at: '2026-09-19T00:30:00Z', is_physical_backup: true },
      ],
    }), { status: 200 })

    await expect(checkManagedStagingBackup({
      runtimeProjectRef: 'staging-ref',
      stagingProjectRef: 'staging-ref',
      accessToken: 'test-token',
      now,
      fetchImpl,
    })).resolves.toMatchObject({ ageSeconds: 5400, physical: true })
  })

  it('fails closed when runtime and backup project refs differ', async () => {
    await expect(checkManagedStagingBackup({
      runtimeProjectRef: 'runtime-ref',
      stagingProjectRef: 'backup-ref',
      accessToken: 'test-token',
      fetchImpl: async () => new Response('{}', { status: 200 }),
    })).rejects.toThrow('STAGING_BACKUP_PROJECT_REF_MISMATCH')
  })

  it('fails closed when the latest completed backup is stale', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      backups: [{ status: 'COMPLETED', inserted_at: '2026-09-17T00:00:00Z', is_physical_backup: true }],
    }), { status: 200 })
    await expect(checkManagedStagingBackup({
      runtimeProjectRef: 'staging-ref',
      stagingProjectRef: 'staging-ref',
      accessToken: 'test-token',
      now: Date.parse('2026-09-19T01:00:00Z'),
      maxAgeSeconds: 90_000,
      fetchImpl,
    })).rejects.toThrow('STAGING_BACKUP_STALE')
  })

  it('accepts physical backup metadata when no timestamped item is returned', () => {
    expect(selectLatestCompletedBackup({
      backups: [],
      physical_backup_data: { latest_physical_backup_date_unix: 1_795_000_000 },
    })).toMatchObject({ physical: true })
  })
})
