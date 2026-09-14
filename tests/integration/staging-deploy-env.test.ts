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
  it('builds the candidate with the current external staging URL', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('"$ROOT/state/current-url.txt"')
    expect(deploy).toContain("'APP_URL': app_url")
  })

  it('normalizes web restart policy and remounts the reconciler after the app swap', () => {
    const deploy = workflow.slice(workflow.indexOf('- name: Deploy exact SHA to homologation'))
    expect(deploy).toContain('RECONCILER=solange-demo-reconciler')
    expect(deploy).toContain('docker run -d --name "$WEB" --restart unless-stopped')
    expect(deploy).toContain('docker restart "$RECONCILER"')
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
