import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rotateScript = readFileSync('scripts/rotate-staging-demo-credential.mjs', 'utf8')
const storageScript = readFileSync('scripts/backup-verify-staging-storage.mjs', 'utf8')
const recoveryScript = readFileSync('scripts/ensure-staging-recovery-backup.sh', 'utf8')
const restoreScript = readFileSync('scripts/verify-staging-logical-backup-docker.sh', 'utf8')
const promoteWorkflow = readFileSync('.github/workflows/staging-promote.yml', 'utf8')
const backupWorkflow = readFileSync('.github/workflows/staging-backup-audit.yml', 'utf8')

describe('staging recovery hardening', () => {
  it('rotates the protected owner credential and verifies both new and legacy logins', () => {
    expect(rotateScript).toContain('STAGING_DEMO_PASSWORD_MUST_ROTATE_LEGACY')
    expect(rotateScript).toContain('auth.admin.updateUserById')
    expect(rotateScript).toContain('signInWithPassword({ email: STAGING_DEMO_EMAIL, password })')
    expect(rotateScript).toContain('password: LEGACY_DEMO_PASSWORD')
    expect(rotateScript).toContain('STAGING_DEMO_LEGACY_PASSWORD_STILL_VALID')
    expect(promoteWorkflow).toContain('Rotate and verify staging demo credential')
    expect(promoteWorkflow).toContain('node scripts/rotate-staging-demo-credential.mjs')
    expect(promoteWorkflow).toContain('STAGING_DEMO_PASSWORD: ${{ secrets.STAGING_DEMO_PASSWORD }}')
  })

  it('backs up and restore-verifies every required private bucket with hashes', () => {
    for (const bucket of [
      'signed-documents-private',
      'fiscal-documents-private',
      'financial-receipts-private',
      'clinical-private',
    ]) expect(storageScript).toContain(bucket)
    expect(storageScript).toContain('storage.createBucket')
    expect(storageScript).toContain('restore.upload')
    expect(storageScript).toContain('restore.download')
    expect(storageScript).toContain("createHash('sha256')")
    expect(storageScript).toContain('storage.emptyBucket')
    expect(storageScript).toContain('storage.deleteBucket')
    expect(recoveryScript).toContain('backup-verify-staging-storage.mjs')
    expect(backupWorkflow).toContain('SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}')
    expect(backupWorkflow).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}')
  })

  it('keeps the protected staging database credential out of process argv', () => {
    expect(recoveryScript).toContain('process.env.SUPABASE_DB_URL')
    expect(recoveryScript).toContain('SUPABASE_DB_PASSWORD=$(node')
    expect(recoveryScript).toContain('export SUPABASE_DB_PASSWORD')
    expect(recoveryScript).toContain('unset SUPABASE_DB_URL')
    expect(recoveryScript).toContain('--project-ref "$SUPABASE_STAGING_PROJECT_REF"')
    expect(recoveryScript).not.toContain('node - "$SUPABASE_DB_URL"')
    expect(recoveryScript).not.toContain('--db-url "$SUPABASE_DB_URL"')
  })

  it('rolls back public exposure on validation failure or workflow cancellation', () => {
    expect(promoteWorkflow).toContain('if: failure() || cancelled()')
    expect(promoteWorkflow).toContain('rm -f "$ROOT/state/public-exposure-enabled"')
    expect(promoteWorkflow).toContain('docker update --restart=no solange-demo-tunnel "$RECONCILER"')
  })

  it('validates restored auth relationships instead of only table presence', () => {
    expect(recoveryScript).toContain('--schema public,clinical,auth')
    expect(restoreScript).toContain("to_regclass('auth.users')")
    expect(restoreScript).toContain('left join auth.users u on u.id=p.user_id')
    expect(restoreScript).toContain('left join auth.users u on u.id=a.actor_user_id')
    expect(restoreScript).toContain('left join auth.users u on u.id=r.author_user_id')
    expect(restoreScript).toContain("contype='f' and not convalidated")
  })
})
