import { describe, expect, it } from 'vitest'
import { createSupabaseTemplateRepository } from './supabase-template-repository'

function fakeClient(row: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table !== 'message_templates') throw new Error(`unexpected table ${table}`)
      const query = {
        eq: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: row, error: null }),
      }
      return { select: () => query }
    },
  }
}

describe('supabase template repository', () => {
  it('resolves the active version for a key+channel so callers need not hardcode it', async () => {
    const repository = createSupabaseTemplateRepository(fakeClient({ version: 3 }) as never)
    expect(await repository.findActiveVersion('appointment_confirmation', 'whatsapp')).toBe(3)
  })

  it('returns null when no active version exists yet', async () => {
    const repository = createSupabaseTemplateRepository(fakeClient(null) as never)
    expect(await repository.findActiveVersion('appointment_confirmation', 'whatsapp')).toBeNull()
  })


  it('returns null for an unknown template key without querying allowed tokens', async () => {
    const repository = createSupabaseTemplateRepository(fakeClient(null) as never)
    expect(await repository.find('not_a_real_key', 'whatsapp', 1)).toBeNull()
  })

  it('returns null when no active template row matches', async () => {
    const repository = createSupabaseTemplateRepository(fakeClient(null) as never)
    expect(await repository.find('appointment_confirmation', 'whatsapp', 1)).toBeNull()
  })

  it('maps an active row and attaches the allowed token list for that key', async () => {
    const repository = createSupabaseTemplateRepository(fakeClient({
      key: 'appointment_confirmation', channel: 'whatsapp', version: 1,
      body: 'Olá {{preferredName}}, confirma sua consulta em {{appointmentDate}} {{appointmentTime}}? {{secureLink}}',
      active: true,
    }) as never)
    const template = await repository.find('appointment_confirmation', 'whatsapp', 1)
    expect(template?.allowedTokens).toEqual(['preferredName', 'appointmentDate', 'appointmentTime', 'secureLink'])
  })
})
