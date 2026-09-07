import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getStaffSession: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/modules/identity/public', () => ({ getStaffSession: mocks.getStaffSession }))
vi.mock('@/platform/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }))
vi.mock('@/shared/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('./dashboard-view', () => ({ DashboardView: () => null }))

import DashboardPage from './page'

describe('DashboardPage authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getStaffSession.mockResolvedValue(null)
    mocks.redirect.mockImplementation(() => { throw new Error('NEXT_REDIRECT:/login') })
    mocks.createServerSupabaseClient.mockImplementation(() => { throw new Error('CLIENT_SHOULD_NOT_BE_CALLED') })
  })

  it('redirects an unauthenticated request before starting dashboard data queries', async () => {
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })
})