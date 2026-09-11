import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/platform/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { getStaffSession } from './get-session'

function clientWith(options: {
  permissions?: unknown[] | null
  permissionError?: unknown
  profile?: unknown
}) {
  const profile = options.profile ?? {
    user_id: 'user-1',
    role: 'secretary',
    display_name: 'Secretaria',
    active: true,
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi
          .fn()
          .mockResolvedValue({ data: { currentLevel: 'aal1' } }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        })),
      })),
    })),
    rpc: vi.fn().mockResolvedValue({
      data: options.permissions ?? [],
      error: options.permissionError ?? null,
    }),
  }
}

describe('getStaffSession permissions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads only validated effective permission keys', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      clientWith({
        permissions: [
          { permission_key: 'patients.read' },
          { permission_key: 'appointments.read' },
          { permission_key: 'patients.read' },
        ],
      }),
    )

    await expect(getStaffSession()).resolves.toMatchObject({
      userId: 'user-1',
      permissions: ['patients.read', 'appointments.read'],
    })
  })

  it('fails closed when the permission RPC errors', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      clientWith({ permissions: [{ permission_key: 'patients.read' }], permissionError: new Error('db') }),
    )

    await expect(getStaffSession()).resolves.toMatchObject({ permissions: [] })
  })

  it('fails closed when a permission row is malformed', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      clientWith({ permissions: [{ permission_key: 'patients.read' }, { permission_key: 'unknown.root' }] }),
    )

    await expect(getStaffSession()).resolves.toMatchObject({ permissions: [] })
  })
})
