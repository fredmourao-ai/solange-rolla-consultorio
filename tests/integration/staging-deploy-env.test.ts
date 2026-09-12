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