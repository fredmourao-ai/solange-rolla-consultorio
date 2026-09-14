import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const previewScript = path.join(process.cwd(), 'scripts/preview-env.mjs')
const stagingScript = path.join(process.cwd(), 'scripts/staging-lock.mjs')
const stagingWorkflow = path.join(process.cwd(), '.github/workflows/staging-promote.yml')
const backupScript = path.join(process.cwd(), 'scripts/backup-homologation.sh')
const base = {
  SUPABASE_BRANCHING_ENABLED: 'true',
  APP_ENV: 'preview',
  GITHUB_REPOSITORY: 'example/repository',
  GITHUB_EVENT_NUMBER: '12',
  VERCEL_URL: 'preview.example.test',
  SUPABASE_PROJECT_REF: 'preview-ref',
  SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
  SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
  WHATSAPP_LIVE_ENABLED: 'false',
  EMAIL_LIVE_ENABLED: 'false',
  NFSE_LIVE_ENABLED: 'false',
}

function run(script: string, environment: Record<string, string>) {
  return execFileSync(process.execPath, [script], {
    env: { ...process.env, ...environment },
    encoding: 'utf8',
  })
}

describe('environment workflow contracts', () => {
  it('keeps automatic staging promotion explicitly opt-in', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain("vars.STAGING_AUTO_PROMOTE_ENABLED == 'true'")
  })

  it('requires all canonical checks and deploys the exact main SHA', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain('workflows: [CI, Database, Repository Governance Gate]')
    expect(workflow).toContain('actions: read')
    expect(workflow).toContain('Verify canonical main SHA and checks')
    expect(workflow).toContain('refs/heads/main')
    expect(workflow).toContain("['CI', 'Database', 'Repository Governance Gate']")
    expect(workflow).toContain('Deploy exact SHA to homologation')
    expect(workflow).toContain('APP_BUILD_SHA')
    expect(workflow).toContain('solange-client-demo-web')
    expect(workflow).toContain('ops/document-worker/run-demo-worker.sh')
    expect(workflow).toContain('ops/messaging-worker/run-demo-worker.sh')
    expect(workflow).toContain('solange-document-worker')
    expect(workflow).toContain('solange-messaging-worker')
    expect(workflow).toContain('Verify deployed SHA')
    expect(workflow).toContain('buildSha')
  })

  it('propagates staging project identity into the generated runtime environment', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain("SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}")
    expect(workflow).toContain("'SUPABASE_PROJECT_REF': os.environ['SUPABASE_PROJECT_REF']")
    expect(workflow).toContain("'SUPABASE_STAGING_PROJECT_REF': os.environ['SUPABASE_STAGING_PROJECT_REF']")
    expect(workflow).toContain("'SUPABASE_PRODUCTION_PROJECT_REF': os.environ['SUPABASE_PRODUCTION_PROJECT_REF']")
    expect(workflow).toContain('WHATSAPP_LIVE_ENABLED: ${{ vars.WHATSAPP_LIVE_ENABLED }}')
    expect(workflow).not.toContain('WHATSApP_LIVE_ENABLED')
  })

  it('emits a preview association only for a dedicated branch', () => {
    expect(run(previewScript, base)).toContain('"supabasePreviewRef":"preview-ref"')
  })

  it('rejects a preview association pointed at staging', () => {
    expect(() => run(previewScript, { ...base, SUPABASE_PROJECT_REF: 'staging-ref' })).toThrow(
      /dedicated Supabase preview/,
    )
  })

  it('uses the Supabase Management API path for staging migrations', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain('SUPABASE_ACCESS_TOKEN')
    expect(workflow).toContain('node scripts/apply-staging-migrations.mjs')
    expect(workflow).not.toContain('SUPABASE_DB_URL')
  })

  it('runs the database security smoke and makes app smoke conditional', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain('node scripts/verify-staging-accounting-rls.mjs')
    expect(workflow).toContain("if: vars.STAGING_APP_URL != ''")
    expect(workflow).not.toContain('test -n "$STAGING_APP_URL"')
  })

  it('accepts workflow_dispatch re-validation runs, not only push, as proof a SHA was checked', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain("github.event.workflow_run.event == 'push' || github.event.workflow_run.event == 'workflow_dispatch'")
    expect(workflow).toContain("acceptedEvents = ['push', 'workflow_dispatch']")
    expect(workflow).toContain("new URLSearchParams({ head_sha: sha, event, per_page: '100' })")
  })

  it('runs browser-driven operational homologation against the exact staged SHA before finalizing the release', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain('Real UI staging homologation')
    expect(workflow).toContain('E2E_TARGET_ENV')
    expect(workflow).toContain('E2E_ALLOWED_BASE_URL')
    expect(workflow).toContain("'E2E_DB_MODE': 'supabase-management-api'")
    expect(workflow).toContain("'SUPABASE_STAGING_PROJECT_REF': os.environ['SUPABASE_STAGING_PROJECT_REF']")
    expect(workflow).toContain("'SUPABASE_ACCESS_TOKEN': os.environ['SUPABASE_ACCESS_TOKEN']")
    expect(workflow).toContain('E2E_EXPECTED_BUILD_SHA')
    expect(workflow).toContain('tests/e2e/real-ui-homologation.spec.ts')
    expect(workflow).toContain('Rollback staging release after failed validation')
    expect(workflow).toContain('Finalize promoted release')
    expect(workflow.indexOf('Real UI staging homologation')).toBeLessThan(workflow.indexOf('Finalize promoted release'))
  })

  it('keeps staging backups host-local and independent of Fred-Win', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    const backup = readFileSync(backupScript, 'utf8')
    expect(backup).toContain('DEST=${SOLANGE_BACKUP_DEST:-/home/ubuntu/solange-client-demo/backups}')
    expect(backup).not.toContain('/mnt/fredwin-backup')
    expect(workflow).toContain('SOLANGE_BACKUP_DEST="$ROOT/backups" scripts/backup-homologation.sh')
    expect(workflow).not.toContain('/home/ubuntu/.local/bin/solange-backup.sh')
  })

  it('rolls back only resources created by the current staging transaction', () => {
    const workflow = readFileSync(stagingWorkflow, 'utf8')
    expect(workflow).toContain('TRANSACTION="$ROOT/state/deploy-transaction-$PROMOTE_SHA"')
    expect(workflow).toContain('APP_SWAPPED=0')
    expect(workflow).toContain('WORKERS_SWAPPED=0')
    expect(workflow).toContain('if [ "$APP_SWAPPED" -eq 1 ] && [ -d "$PREVIOUS" ]; then')
    expect(workflow).toContain('[ -f "$TRANSACTION" ] || exit 0')
    expect(workflow).toContain('rm -f "$TRANSACTION"')
    expect(workflow).toContain(`printf '%s\\n' "$PROMOTE_SHA" > "$TRANSACTION"`)
    expect(workflow).toContain('test -f "$STAGE/package.json"')
    expect(workflow).toContain('test -f "$STAGE/.env.production.local"')
    expect(workflow).toContain('test -s "$STAGE/.next/BUILD_ID"')
  })

  it('requires explicit staging approval and distinct project refs', () => {
    expect(
      run(stagingScript, {
        APP_ENV: 'staging',
        STAGING_COMMIT_SHA: 'a'.repeat(40),
        STAGING_PROMOTION_APPROVED: 'true',
        SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
        SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
        WHATSAPP_LIVE_ENABLED: 'false',
        EMAIL_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }),
    ).toContain('staging promotion authorized')
    expect(() =>
      run(stagingScript, {
        APP_ENV: 'staging',
        STAGING_COMMIT_SHA: 'a'.repeat(40),
        STAGING_PROMOTION_APPROVED: 'false',
        SUPABASE_STAGING_PROJECT_REF: 'staging-ref',
        SUPABASE_PRODUCTION_PROJECT_REF: 'production-ref',
        WHATSAPP_LIVE_ENABLED: 'false',
        EMAIL_LIVE_ENABLED: 'false',
        NFSE_LIVE_ENABLED: 'false',
      }),
    ).toThrow(/requires STAGING_PROMOTION_APPROVED/)
  })
})
