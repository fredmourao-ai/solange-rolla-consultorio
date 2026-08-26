import { createServerSupabaseClient } from '@/platform/supabase/server'
import { isAppRole } from '../domain/role'
import type { StaffSession } from './require-role'

export async function getStaffSession(): Promise<StaffSession | null> {
  let client
  try {
    client = await createServerSupabaseClient()
  } catch {
    return null
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) return null

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('user_id, role, display_name, active')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (profileError || !profile || !isAppRole(profile.role)) return null

  const { data: aalData } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1'
  return {
    userId: profile.user_id,
    role: profile.role,
    displayName: profile.display_name,
    active: profile.active,
    aal,
  }
}
