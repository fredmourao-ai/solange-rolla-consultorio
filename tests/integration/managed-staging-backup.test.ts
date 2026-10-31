import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const loadYaml = (require('js-yaml') as { load: (content: string) => unknown }).load
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
const managedBackupWorkflow = readFileSync('.github/workflows/staging-managed-backup-audit.yml', 'utf8')

describe('staging logical recovery fallback', () => {
  it('exports the exact linked staging project and restore-verifies it', () => {
    expect(recoveryScript).toContain('SUPABASE_STAGING_PROJECT_REF')
    expect(recoveryScript).toContain('SUPABASE_DB_URL')
    expect(recoveryScript).toContain('process.env.SUPABASE_DB_URL')
    expect(recoveryScript).toContain('export SUPABASE_DB_PASSWORD')
    expect(recoveryScript).toContain('unset SUPABASE_DB_URL')
    expect(recoveryScript).toContain('db dump --project-ref "$SUPABASE_STAGING_PROJECT_REF"')
    expect(recoveryScript).not.toContain('db dump --db-url "$SUPABASE_DB_URL"')
    expect(recoveryScript).toContain('staging_recovery_failed local_db_url_forbidden')
    expect(recoveryScript).toContain('db_project_ref_mismatch')
    expect(recoveryScript).toContain('--schema public,clinical,auth')
    expect(recoveryScript).toContain('--data-only --use-copy')
    expect(recoveryScript).toContain('verify-staging-logical-backup-docker.sh')
    expect(recoveryScript).not.toContain('supabase_db_solange-client-demo')
    expect(restoreScript).toContain("to_regclass('auth.users') is not null")
    expect(restoreScript).toContain('(select count(*) from pg_policies)>0')
  })

  it('separates untrusted PR validation from protected main-only staging recovery', () => {
    const prWorkflow = loadYaml(backupWorkflow) as {
      on: { pull_request_target?: unknown; workflow_dispatch?: unknown; schedule?: unknown }
      permissions: { contents: string }
      concurrency: { 'cancel-in-progress': boolean }
      jobs: { 'validate-pr': { if: string; 'runs-on': string; permissions: { contents: string }; steps: Array<{ with?: Record<string, unknown> }> } }
    }
    const stagingWorkflow = loadYaml(managedBackupWorkflow) as {
      on: { pull_request_target?: unknown; workflow_dispatch?: unknown; schedule?: unknown }
      concurrency: { 'cancel-in-progress': boolean }
      jobs: {
        'managed-backup': { if: string; environment: string; 'runs-on': string[]; steps: unknown[] }
      }
    }
    const prJob = prWorkflow.jobs['validate-pr']
    const stagingJob = stagingWorkflow.jobs['managed-backup']

    expect(prWorkflow.on.pull_request_target).toBeDefined()
    expect(prWorkflow.on.workflow_dispatch).toBeUndefined()
    expect(prWorkflow.on.schedule).toBeUndefined()
    expect(prWorkflow.concurrency['cancel-in-progress']).toBe(false)
    expect(prJob.if).toBe("github.event_name == 'pull_request_target'")
    expect(prJob['runs-on']).toBe('ubuntu-latest')
    expect(prWorkflow.permissions).toEqual({ contents: 'read' })
    expect(prJob.permissions).toEqual({ contents: 'read' })
    expect(prJob.steps[0]?.with?.['persist-credentials']).toBe(false)
    expect(prJob.steps[0]?.with?.ref).toBe('${{ github.event.pull_request.head.sha }}')
    expect(JSON.stringify(prWorkflow)).not.toContain('secrets.')
    expect(JSON.stringify(prWorkflow)).not.toContain('self-hosted')
    expect(JSON.stringify(prWorkflow)).not.toContain('cache')
    expect(JSON.stringify(prWorkflow)).not.toContain('upload-artifact')
    expect(JSON.stringify(prWorkflow)).not.toContain('download-artifact')
    expect(JSON.stringify(prWorkflow)).not.toContain('id-token: write')
    expect(JSON.stringify(prWorkflow)).toContain('github.event.pull_request.head.sha')

    expect(stagingWorkflow.on.pull_request_target).toBeUndefined()
    expect(stagingWorkflow.on.workflow_dispatch).toBeDefined()
    expect(stagingWorkflow.on.schedule).toBeUndefined()
    expect(stagingWorkflow.concurrency['cancel-in-progress']).toBe(false)
    expect(stagingJob.if).toBe("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'")
    expect(stagingJob.environment).toBe('staging')
    expect(stagingJob['runs-on']).toContain('solange-staging-host')
    expect(JSON.stringify(stagingJob)).toContain('secrets.SUPABASE_ACCESS_TOKEN')
    expect(JSON.stringify(stagingJob)).toContain('scripts/ensure-staging-recovery-backup.sh')
  })
})
