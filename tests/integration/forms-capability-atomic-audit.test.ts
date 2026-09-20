import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/app/(protected)/formularios/actions.ts', 'utf8')
const migration = readFileSync('supabase/migrations/20260919227000_forms_capability_atomic_audit.sql', 'utf8')

describe('forms capability atomicity contract', () => {
  it('uses atomic RPCs and generates capability material only in server memory', () => {
    expect(source).toContain('create_form_template_atomic')
    expect(source).toContain('issue_form_capability_atomic')
    expect(source).toContain('createCapabilityMaterial()')
    expect(source).toContain('rawToken')
    expect(source).toContain('tokenHash')
    expect(source).not.toContain('createServiceRoleSupabaseClient')
    expect(source).not.toContain('createSupabaseCapabilityIssuanceRepository')
    expect(source).not.toContain('issueCapability(')
  })

  it('does not persist submissions/capabilities/audit in separate application writes', () => {
    expect(source).not.toContain(".from('form_submissions').insert")
    expect(source).not.toContain(".from('capabilities').insert")
    expect(source).not.toContain(".from('audit_events').insert")
  })

  it('never sends the raw token to the database RPC', () => {
    const start = source.indexOf("client.rpc('issue_form_capability_atomic'")
    const end = source.indexOf('if (issueError', start)
    expect(start).toBeGreaterThan(-1)
    expect(source.slice(start, end)).toContain('p_token_hash: tokenHash')
    expect(source.slice(start, end)).not.toContain('rawToken')
  })

  it('keeps token hash out of audit metadata and explicitly authenticates the definer RPC', () => {
    const fn = migration.slice(migration.indexOf('create or replace function public.issue_form_capability_atomic'))
    const auditStart = fn.indexOf('insert into public.audit_events')
    const auditEnd = fn.indexOf('return p_capability_id', auditStart)
    expect(fn).toContain('security definer')
    expect(fn).toContain('actor uuid := auth.uid()')
    expect(fn).toContain("public.has_permission('forms.send')")
    expect(fn.slice(auditStart, auditEnd)).not.toContain('p_token_hash')
  })
})
