import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/(protected)/fiscal/operacoes/actions.ts', 'utf8')
const page = readFileSync('src/app/(protected)/fiscal/operacoes/page.tsx', 'utf8')

describe('fiscal atomic audit contract', () => {
  it('routes issue and cancel through atomic RPCs', () => {
    expect(actions).toContain("client.rpc('issue_mock_fiscal_document_atomic'")
    expect(actions).toContain("client.rpc('cancel_mock_fiscal_document_atomic'")
    expect(actions).not.toContain(".from('fiscal_documents').insert")
    expect(actions).not.toContain(".from('fiscal_documents').update")
    expect(actions).not.toContain(".from('fiscal_attempts').insert")
    expect(actions).not.toContain(".from('fiscal_cancellation_events').insert")
    expect(actions).not.toContain(".from('audit_events').insert")
  })

  it('compensates private storage if the SQL commit fails', () => {
    const rpc = actions.indexOf("client.rpc('issue_mock_fiscal_document_atomic'")
    const failure = actions.indexOf('if (error || persistedId !== id)', rpc)
    const cleanup = actions.indexOf('bucket.remove([xmlPath, pdfPath])', failure)
    expect(rpc).toBeGreaterThan(-1)
    expect(failure).toBeGreaterThan(rpc)
    expect(cleanup).toBeGreaterThan(failure)
    expect(actions.slice(failure, cleanup + 100)).toContain('FISCAL_ARTIFACT_ROLLBACK_FAILED')
  })

  it('authorizes fiscal operations by permission rather than role-only mutation checks', () => {
    expect(actions).toContain("context('fiscal.issue')")
    expect(actions).toContain("context('fiscal.cancel')")
    expect(actions).toContain('authorizeStaffPermission(session, permission)')
  })

  it('does not offer critical cancellation UI without fiscal.cancel', () => {
    expect(page).toContain("const canCancel = hasSessionPermission(session, 'fiscal.cancel')")
    expect(page).toContain("canCancel && doc.provider === 'mock' && doc.status === 'issued'")
    expect(page).toContain("const canIssue = hasSessionPermission(session, 'fiscal.issue')")
  })
})
