import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/staging-promote.yml', 'utf8')

describe('staging deploy environment', () => {
  it('pins the stateful staging deployment to the dedicated homologation host', () => {
    const promote = workflow.slice(workflow.indexOf('  promote:'), workflow.indexOf('    environment: staging'))
    expect(promote).toContain('runs-on: [self-hosted, Linux, ARM64, solange-ci, solange-staging-host]')
  })

  it('propagates every Supabase project identity into the runtime environment', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}')
    expect(deploy).toContain('SUPABASE_STAGING_PROJECT_REF: ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}')
    expect(deploy).toContain('SUPABASE_PRODUCTION_PROJECT_REF: ${{ secrets.SUPABASE_PRODUCTION_PROJECT_REF }}')
    expect(deploy).toContain("'SUPABASE_PROJECT_REF': os.environ['SUPABASE_PROJECT_REF']")
    expect(deploy).toContain("'SUPABASE_STAGING_PROJECT_REF': os.environ['SUPABASE_STAGING_PROJECT_REF']")
    expect(deploy).toContain("'SUPABASE_PRODUCTION_PROJECT_REF': os.environ['SUPABASE_PRODUCTION_PROJECT_REF']")
  })

  it('disables TLS only for the loopback homologation database push', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain("hostname in {'127.0.0.1', 'localhost'}")
    expect(deploy).toContain("query['sslmode'] = 'disable'")
  })
})

describe('staging deploy live-channel flags', () => {
  it('uses the canonical WhatsApp environment variable name', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('WHATSAPP_LIVE_ENABLED: ${{ vars.WHATSAPP_LIVE_ENABLED }}')
    expect(deploy).not.toContain('WHATSApP_LIVE_ENABLED')
  })
})

describe('staging database endpoint readiness', () => {
  it('repairs a missing loopback database publication before migration push', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('STAGING_DB_CONTAINER=supabase_db_solange-client-demo')
    expect(deploy).toContain('pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"')
    expect(deploy).toContain('docker restart -t 30 "$STAGING_DB_CONTAINER"')
    expect(deploy).toContain('staging database endpoint unavailable after repair')
  })
})

describe('staging runtime URL and reconciler contract', () => {
  it('uses a stable runner-local URL for staging runtime and acceptance', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(workflow).toContain('STAGING_ACCEPTANCE_URL: http://127.0.0.1:3200')
    expect(deploy).toContain("'APP_URL': app_url")
    expect(deploy).not.toContain('"$ROOT/state/current-url.txt"')
    expect(deploy).toContain('URL="$STAGING_ACCEPTANCE_URL"')
  })

  it('normalizes web, tunnel, and reconciler restart policies before the app swap', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('RECONCILER=solange-demo-reconciler')
    expect(deploy).toContain('TUNNEL=solange-demo-tunnel')
    expect(deploy).toContain('docker update --restart unless-stopped "$RECONCILER" "$TUNNEL"')
    expect(deploy).toContain('docker run -d --name "$WEB" --restart unless-stopped')
    expect(deploy).toContain('docker restart "$RECONCILER"')
    expect(deploy).toContain('docker inspect -f \'{{.HostConfig.RestartPolicy.Name}}\' solange-demo-reconciler')
    expect(deploy).toContain('docker inspect -f \'{{.HostConfig.RestartPolicy.Name}}\' solange-demo-tunnel')
  })

  it('uses the versioned reconciler instead of the legacy host preflight', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('ops/staging/reconcile-demo.sh')
    expect(deploy).not.toContain('"$ROOT/preflight.sh"')
  })
})

describe('staging reconciler transactional rollback', () => {
  it('backs up and restores the reconciler script with the release transaction', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('RECONCILER_PREVIOUS="$ROOT/reconcile-previous.sh"')
    expect(deploy).toContain('cp -p "$ROOT/reconcile.sh" "$RECONCILER_PREVIOUS"')
    expect(deploy).toContain('mv "$RECONCILER_PREVIOUS" "$ROOT/reconcile.sh"')
    expect(deploy).toContain('rm -f "$ROOT/reconcile-previous.sh"')
  })
})

describe('staging appointment atomic-boundary rollout', () => {
  it('bridges legacy DML only until the exact-SHA app is swapped and restores it on rollback', () => {
    expect(workflow).toContain('appointments-atomic-compatible')
    expect(workflow).toContain('appointments-legacy-compat-$PROMOTE_SHA')
    expect(workflow).toContain('set-staging-appointment-write-mode.mjs legacy-compatible')
    expect(workflow).toContain('set-staging-appointment-write-mode.mjs atomic-only')
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy.indexOf('set-staging-appointment-write-mode.mjs atomic-only')).toBeLessThan(
      deploy.indexOf('docker stop "$WEB"'),
    )
    const rollback = workflow.slice(workflow.indexOf('- name: Rollback staging release after failed validation'))
    expect(rollback).toContain('set-staging-appointment-write-mode.mjs legacy-compatible')
    expect(workflow).toContain('printf \'%s\\n\' "$PROMOTE_SHA" > "$ROOT/state/appointments-atomic-compatible"')
  })

  it('derives atomic compatibility from the deployed SHA when the host marker is missing', () => {
    const migrationStep = workflow.slice(
      workflow.indexOf('- name: Apply forward migrations'),
      workflow.indexOf('- name: Verify staging accounting RLS'),
    )
    expect(migrationStep).toContain('DEPLOYED_SHA="$(cat "$STAGING_DEPLOY_ROOT/state/deployed-sha.txt")"')
    expect(migrationStep).toContain('git cat-file -e "$DEPLOYED_SHA:supabase/migrations/20261006004600_appointments_admin_atomic_audit.sql"')
    expect(migrationStep.indexOf('set-staging-appointment-write-mode.mjs atomic-only')).toBeLessThan(
      migrationStep.lastIndexOf('set-staging-appointment-write-mode.mjs legacy-compatible'),
    )
  })

  it('continues restoring the release before surfacing a failed compatibility grant restore', () => {
    const rollback = workflow.slice(workflow.indexOf('- name: Rollback staging release after failed validation'))
    expect(rollback).toContain('APPOINTMENT_MODE_RESTORE_FAILED=0')
    expect(rollback).toContain('for attempt in 1 2 3')
    expect(rollback).toContain('APPOINTMENT_MODE_RESTORE_FAILED=1')
    expect(rollback.indexOf('docker rm -f "$WEB"')).toBeLessThan(
      rollback.indexOf('exit "$APPOINTMENT_MODE_RESTORE_FAILED"'),
    )
    expect(rollback.indexOf('exit "$APPOINTMENT_MODE_RESTORE_FAILED"')).toBeLessThan(
      rollback.indexOf('rm -f "$TRANSACTION" "$APPOINTMENT_COMPAT_MARKER"'),
    )
  })
})

describe('staging cloud homologation data contract', () => {
  it('seeds and verifies the same dedicated cloud staging project used by the browser', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(workflow).toContain('Seed synthetic staging fixtures')
    expect(workflow).toContain('node scripts/seed-staging-project.mjs')
    expect(deploy).toContain("'E2E_DB_MODE': 'supabase-management-api'")
    expect(deploy).toContain("'SUPABASE_STAGING_PROJECT_REF': os.environ['SUPABASE_STAGING_PROJECT_REF']")
    expect(deploy).toContain("'SUPABASE_ACCESS_TOKEN': os.environ['SUPABASE_ACCESS_TOKEN']")
    expect(deploy).not.toContain("'E2E_ALLOWED_DB_URL': values['DB_URL']")
  })
})
