import { describe, expect, it, vi } from 'vitest'
import { getClinicalAttachmentUrl } from './get-clinical-attachment'

describe('getClinicalAttachmentUrl', () => {
  it('authorizes before signing and audits the approved download', async () => {
    const order: string[] = []
    const audit = { insert: vi.fn(async () => { order.push('audit') }) }
    const result = await getClinicalAttachmentUrl({
      id: 'attachment-1',
      recordId: 'record-1',
      objectPath: 'clinical/record-1/attachment-1/attachment',
    }, {
      authorizeOwnerAal2: async () => { order.push('authorize') },
      storage: {
        createSignedUrl: async () => { order.push('sign'); return 'https://signed.example.test' },
      },
      actorUserId: 'owner-1',
      audit,
    })

    expect(result).toBe('https://signed.example.test')
    expect(order).toEqual(['authorize', 'sign', 'audit'])
    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'clinical_attachment.viewed',
      entityId: 'attachment-1',
      metadata: { recordId: 'record-1' },
    }))
  })

  it('does not sign or audit when authorization fails', async () => {
    const sign = vi.fn()
    const audit = { insert: vi.fn() }

    await expect(getClinicalAttachmentUrl({
      id: 'attachment-1',
      recordId: 'record-1',
      objectPath: 'clinical/record-1/attachment-1/attachment',
    }, {
      authorizeOwnerAal2: async () => { throw new Error('MFA_REQUIRED') },
      storage: { createSignedUrl: sign },
      actorUserId: 'secretary-1',
      audit,
    })).rejects.toThrow('MFA_REQUIRED')

    expect(sign).not.toHaveBeenCalled()
    expect(audit.insert).not.toHaveBeenCalled()
  })
})
