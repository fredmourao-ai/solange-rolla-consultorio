'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authorizeStaffPermission, getStaffSession, isAppPermission, isAppRole, type AppPermission } from '@/modules/identity/public'
import { serverEnv } from '@/platform/env/server'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { createServiceRoleSupabaseClient } from '@/platform/supabase/service-role'

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

async function requireCriticalPermission(permission: AppPermission, returnTo: string) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.aal !== 'aal2') {
    redirect(`/seguranca?reason=mfa_required&returnTo=${encodeURIComponent(returnTo)}`)
  }
  return authorizeStaffPermission(session, permission, { aal2: true })
}

export async function inviteStaffUserAction(formData: FormData) {
  await requireCriticalPermission('users.manage', '/usuarios')

  const email = value(formData, 'email').toLowerCase()
  const displayName = value(formData, 'display_name')
  const role = value(formData, 'role')
  if (!email || !displayName || !isAppRole(role)) redirect('/usuarios?error=invalid_user')

  const admin = createServiceRoleSupabaseClient()
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${serverEnv().APP_URL.replace(/\/$/, '')}/login`,
  })
  const invitedUser = invite.user
  if (inviteError || !invitedUser) redirect('/usuarios?error=invite_failed')

  const client = await createServerSupabaseClient()
  const { error: profileError } = await client.rpc('upsert_staff_profile' as never, {
    p_user_id: invitedUser.id,
    p_display_name: displayName,
    p_role: role,
    p_active: true,
  } as never)

  if (profileError) {
    await admin.auth.admin.deleteUser(invitedUser.id)
    redirect('/usuarios?error=profile_failed')
  }

  revalidatePath('/usuarios')
  redirect('/usuarios?status=invite_sent')
}

export async function updateStaffProfileAction(formData: FormData) {
  const userId = value(formData, 'user_id')
  await requireCriticalPermission('users.manage', `/usuarios/${userId}`)

  const displayName = value(formData, 'display_name')
  const role = value(formData, 'role')
  const active = formData.get('active') === 'on'
  if (!userId || !displayName || !isAppRole(role)) redirect(`/usuarios/${userId}?error=invalid_user`)

  const client = await createServerSupabaseClient()
  const { error } = await client.rpc('upsert_staff_profile' as never, {
    p_user_id: userId,
    p_display_name: displayName,
    p_role: role,
    p_active: active,
  } as never)
  if (error) redirect(`/usuarios/${userId}?error=profile_failed`)

  revalidatePath('/usuarios')
  revalidatePath(`/usuarios/${userId}`)
  redirect(`/usuarios/${userId}?status=profile_updated`)
}

export async function saveUserPermissionAction(formData: FormData) {
  const userId = value(formData, 'user_id')
  await requireCriticalPermission('permissions.manage', `/usuarios/${userId}`)

  const permissionKey = value(formData, 'permission_key')
  const mode = value(formData, 'mode')
  if (!userId || !isAppPermission(permissionKey) || !['default', 'allow', 'deny'].includes(mode)) {
    redirect(`/usuarios/${userId}?error=invalid_permission`)
  }

  const client = await createServerSupabaseClient()
  const response = mode === 'default'
    ? await client.rpc('clear_user_permission_override' as never, {
        p_user_id: userId,
        p_permission_key: permissionKey,
      } as never)
    : await client.rpc('set_user_permission_override' as never, {
        p_user_id: userId,
        p_permission_key: permissionKey,
        p_allowed: mode === 'allow',
      } as never)

  if (response.error) redirect(`/usuarios/${userId}?error=permission_failed`)

  revalidatePath(`/usuarios/${userId}`)
  redirect(`/usuarios/${userId}?status=permission_updated`)
}
