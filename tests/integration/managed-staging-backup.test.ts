import { readFileSync } from 'node:fs'
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



const recoveryScript = readFileSync('scripts/ensure-staging-recovery-backup.sh', 'utf8')
const restoreScript = readFileSync('scripts/verify-staging-logical-backup-docker.sh', 'utf8')
const backupWorkflow = readFileSync('.github/workflows/staging-backup-audit.yml', 'utf8')

describe('staging logical recovery fallback', () => {
  it('exports the exact linked staging project and restore-verifies it', () => {
    expect(recoveryScript).toContain('SUPABASE_STAGING_PROJECT_REF')
    expect(recoveryScript).toContain('SUPABASE_DB_URL')
    expect(recoveryScript).toContain('db dump --db-url "$SUPABASE_DB_URL"')
    expect(recoveryScript).not.toContain('db dump --project-ref')
    expect(recoveryScript).toContain('staging_recovery_failed local_db_url_forbidden')
    expect(recoveryScript).toContain('db_project_ref_mismatch')
    expect(recoveryScript).toContain('--schema public,clinical,auth')
    expect(recoveryScript).toContain('--data-only --use-copy')
    expect(recoveryScript).toContain('verify-staging-logical-backup-docker.sh')
    expect(recoveryScript).not.toContain('supabase_db_solange-client-demo')
    expect(restoreScript).toContain("to_regclass('auth.users') is not null")
    expect(restoreScript).toContain('(select count(*) from pg_policies)>0')
  })

  it('runs daily on the staging host and on protected PR validation', () => {
    expect(backupWorkflow).toContain("cron: '17 5 * * *'")
    expect(backupWorkflow).toContain('solange-staging-host')
    expect(backupWorkflow).toContain('scripts/ensure-staging-recovery-backup.sh')
    expect(backupWorkflow).toContain('Verify protected staging credential is configured')
    expect(backupWorkflow).toContain('STAGING_DEMO_PASSWORD: ${{ secrets.STAGING_DEMO_PASSWORD }}')
    expect(backupWorkflow).toContain('SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}')
    expect(backupWorkflow).toContain('SUPABASE_PRODUCTION_PROJECT_REF: ${{ secrets.SUPABASE_PRODUCTION_PROJECT_REF }}')
    expect(backupWorkflow).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}')
    expect(backupWorkflow).toContain('SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}')
    expect(backupWorkflow).toContain('test "${#STAGING_DEMO_PASSWORD}" -ge 32')
  })
})
