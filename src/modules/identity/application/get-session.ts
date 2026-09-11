import { createServerSupabaseClient } from '@/platform/supabase/server'
import { isAppPermission, type AppPermission } from '../domain/permission'
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

  const { data: permissionRows, error: permissionError } = await client.rpc('list_current_permissions')
  const permissions: AppPermission[] = []

  if (!permissionError && Array.isArray(permissionRows)) {
    let malformed = false
    for (const row of permissionRows) {
      const key = row?.permission_key
      if (typeof key !== 'string' || !isAppPermission(key)) {
        malformed = true
        break
      }
      if (!permissions.includes(key)) permissions.push(key)
    }
    if (malformed) permissions.length = 0
  }

  return {
    userId: profile.user_id,
    role: profile.role,
    displayName: profile.display_name,
    active: profile.active,
    aal,
    permissions,
  }
}
