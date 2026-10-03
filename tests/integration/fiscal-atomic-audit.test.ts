import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/(protected)/fiscal/operacoes/actions.ts', 'utf8')
const migration = readFileSync('supabase/migrations/20260919230000_fiscal_atomic_audit.sql', 'utf8')
const page = readFileSync('src/app/(protected)/fiscal/operacoes/page.tsx', 'utf8')

describe('fiscal atomic audit contract', () => {
  it('routes issue through a durable leased saga and cancel through an atomic RPC', () => {
    expect(actions).toContain("client.rpc('begin_mock_fiscal_document_issue_atomic'")
    expect(actions).toContain("client.rpc('complete_mock_fiscal_document_issue_atomic'")
    expect(actions).toContain("client.rpc('fail_mock_fiscal_document_issue_atomic'")
    expect(actions).toContain("client.rpc('cancel_mock_fiscal_document_atomic'")
    expect(actions).toContain('const attemptId = randomUUID()')
    expect(actions).toContain('p_attempt_id: attemptId')
    expect(actions).toContain('parseMockIssueLease(beginData)')
    expect(actions).not.toContain(".from('fiscal_documents').insert")
    expect(actions).not.toContain(".from('fiscal_documents').update")
    expect(actions).not.toContain(".from('fiscal_attempts').insert")
    expect(actions).not.toContain(".from('fiscal_cancellation_events').insert")
    expect(actions).not.toContain(".from('audit_events').insert")
  })

  it('rejects concurrent/stale attempts and binds storage paths to the active lease', () => {
    expect(migration).toContain("raise exception 'FISCAL_ISSUE_IN_PROGRESS'")
    expect(migration).toContain("raise exception 'FISCAL_ISSUE_LEASE_LOST'")
    expect(migration).toContain("active_started_at > clock_timestamp() - interval '5 minutes'")
    expect(migration).toContain("a.correlation_id::text = split_part(storage.objects.name, '/', 2)")
    expect(migration).toContain("correlation_id = p_attempt_id")
    expect(migration).toContain("p_xml_path <> p_document_id::text || '/' || p_attempt_id::text || '/nfse.xml'")
    expect(actions).toContain('const xmlPath = `${id}/${attemptId}/nfse.xml`')
    expect(actions).toContain('const previousXmlPath = `${id}/${lease.previousAttemptId}/nfse.xml`')
    expect(actions).toContain('PREVIOUS_ARTIFACT_CLEANUP_FAILED')
  })

  it('records retryable failure when storage/finalization cannot complete', () => {
    expect(actions).toContain("recordIssueFailure(client, id, attemptId, 'XML_STORAGE_FAILED')")
    expect(actions).toContain("cleanup.error ? 'ARTIFACT_CLEANUP_FAILED' : 'PDF_STORAGE_FAILED'")
    expect(actions).toContain("cleanup.error ? 'FINALIZE_FAILED_CLEANUP_PENDING' : 'FINALIZE_FAILED'")
    expect(migration).toContain("set status = 'failed_retryable'")
    expect(migration).toContain("provider_status = 'lease_expired'")
    expect(migration).toContain("error_code = 'PROCESSING_LEASE_EXPIRED'")
  })

  it('authorizes fiscal operations by permission rather than role-only mutation checks', () => {
    expect(actions).toContain("context('fiscal.issue')")
    expect(actions).toContain("context('fiscal.cancel')")
    expect(actions).toContain('authorizeStaffPermission(session, permission)')
    expect(migration).not.toContain("public.current_app_role() not in ('psychologist_owner','secretary')")
    expect(migration).not.toContain("public.current_app_role() <> 'psychologist_owner'")
  })

  it('does not offer critical cancellation UI without fiscal.cancel', () => {
    expect(page).toContain("const canCancel = hasSessionPermission(session, 'fiscal.cancel')")
    expect(page).toContain("canCancel && doc.provider === 'mock' && doc.status === 'issued'")
    expect(page).toContain("const canIssue = hasSessionPermission(session, 'fiscal.issue')")
  })
})
