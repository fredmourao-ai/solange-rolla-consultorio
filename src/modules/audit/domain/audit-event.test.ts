import { describe, expect, it } from 'vitest'
import { buildAuditMetadata, createAuditEvent } from './audit-event'

describe('audit event metadata', () => {
  it.each(['content', 'answers', 'notes', 'token', 'secret'])(
    'rejects sensitive key %s',
    (key) => {
      expect(() => buildAuditMetadata({ [key]: 'nao persistir' })).toThrow(
        'SENSITIVE_AUDIT_METADATA',
      )
    },
  )

  it('rejects sensitive keys nested in metadata', () => {
    expect(() => buildAuditMetadata({ details: { clinical_notes: 'nao persistir' } })).toThrow(
      'SENSITIVE_AUDIT_METADATA',
    )
  })

  it('creates an audit event with sanitized metadata', () => {
    expect(
      createAuditEvent({
        actorId: '00000000-0000-0000-0000-000000000001',
        action: 'person.created',
        entityType: 'person',
        entityId: '00000000-0000-0000-0000-000000000002',
        correlationId: 'request-1',
        metadata: { source: 'secretary-ui', durationMs: 12 },
      }),
    ).toMatchObject({
      actorId: '00000000-0000-0000-0000-000000000001',
      action: 'person.created',
      metadata: { source: 'secretary-ui', durationMs: 12 },
    })
  })
})
