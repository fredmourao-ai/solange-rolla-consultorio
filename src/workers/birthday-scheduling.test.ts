import { describe, expect, it, vi } from 'vitest'

const rows = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }))
vi.mock('@/platform/supabase/service-role', () => ({ createServiceRoleSupabaseClient: () => ({ from: () => ({ select: () => ({ eq: async () => ({ data: rows.value, error: null }) }) }) }) }))
import { loadBirthdayCandidates } from './birthday-scheduling'

describe('birthday candidate loader', () => {
  it('uses the configured channel contact and skips unsupported/missing channels', async () => {
    rows.value = [
      { id: '1', preferred_name: 'Ana', civil_name: 'Ana', birth_date: '1990-09-04', birthday_messages_enabled: true, preferred_channel: 'email', email_normalized: 'ana@example.com', phone_e164: null },
      { id: '2', preferred_name: null, civil_name: 'Bia', birth_date: '1991-09-04', birthday_messages_enabled: true, preferred_channel: 'none', email_normalized: 'bia@example.com', phone_e164: null },
    ]
    expect(await loadBirthdayCandidates()).toEqual([{ id: '1', preferredName: 'Ana', birthDate: '1990-09-04', enabled: true, channel: 'email', recipient: 'ana@example.com' }])
  })
})
