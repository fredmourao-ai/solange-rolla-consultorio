import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { hasSessionPermission, getStaffSession, isAppPermission, isAppRole } from '@/modules/identity/public'
import { ROLE_LABELS, UserAccessEditor, type StaffUserSummary, type UserAccessRow } from '@/modules/identity/ui/user-access-editor'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { saveUserPermissionAction, updateStaffProfileAction } from '../actions'

type RawStaffUser = {
  user_id: string
  display_name: string
  role: string
  active: boolean
  email: string | null
  last_sign_in_at: string | null
}

type RawAccessRow = {
  permission_key: string
  area: string
  label: string
  clinical: boolean
  requires_aal2: boolean
  sort_order: number
  role_default: boolean
  override_allowed: boolean | null
  effective_allowed: boolean
}

function feedback(search: { status?: string; error?: string }) {
  if (search.status === 'permission_updated') return { kind: 'success', text: 'Acesso atualizado.' }
  if (search.status === 'profile_updated') return { kind: 'success', text: 'Dados do usuário atualizados.' }
  if (search.error === 'invalid_permission') return { kind: 'error', text: 'Escolha uma opção de acesso válida.' }
  if (search.error === 'permission_failed') return { kind: 'error', text: 'Não foi possível alterar este acesso. A proteção do sistema pode impedir elevação indevida de privilégio.' }
  if (search.error === 'invalid_user') return { kind: 'error', text: 'Confira os dados do usuário.' }
  if (search.error === 'profile_failed') return { kind: 'error', text: 'Não foi possível atualizar o perfil deste usuário.' }
  return null
}

export default async function UserAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ status?: string; error?: string }>
}) {
  const { userId } = await params
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.aal !== 'aal2') redirect(`/seguranca?reason=mfa_required&returnTo=${encodeURIComponent(`/usuarios/${userId}`)}`)

  const canManageProfile = hasSessionPermission(session, 'users.manage')
  const canManagePermissions = hasSessionPermission(session, 'permissions.manage')
  if (!canManageProfile && !canManagePermissions) redirect('/usuarios')

  const client = await createServerSupabaseClient()
  const { data: usersData, error: usersError } = await client.rpc('list_staff_users' as never)
  if (usersError) throw new Error('STAFF_LIST_FAILED')

  const rawUser = ((usersData ?? []) as unknown as RawStaffUser[]).find((row) => row.user_id === userId)
  if (!rawUser || !isAppRole(rawUser.role)) notFound()

  const user: StaffUserSummary = {
    userId: rawUser.user_id,
    displayName: rawUser.display_name,
    role: rawUser.role,
    active: rawUser.active,
    email: rawUser.email,
    lastSignInAt: rawUser.last_sign_in_at,
  }

  let permissions: UserAccessRow[] = []
  if (canManagePermissions) {
    const { data: accessData, error: accessError } = await client.rpc('list_user_access' as never, { p_user_id: userId } as never)
    if (accessError) throw new Error('STAFF_ACCESS_LOAD_FAILED')
    permissions = ((accessData ?? []) as unknown as RawAccessRow[])
      .filter((row) => isAppPermission(row.permission_key))
      .map((row) => ({
        permissionKey: row.permission_key as UserAccessRow['permissionKey'],
        area: row.area,
        label: row.label,
        clinical: row.clinical,
        requiresAal2: row.requires_aal2,
        sortOrder: row.sort_order,
        roleDefault: row.role_default,
        overrideAllowed: row.override_allowed,
        effectiveAllowed: row.effective_allowed,
      }))
  }

  const search = await searchParams
  const message = feedback(search)

  return <>
    <PageHeader
      title={user.displayName}
      description={`${ROLE_LABELS[user.role]} · ${user.email ?? 'E-mail indisponível'}`}
      actions={<Link className="ui-button ui-button--outline" href="/usuarios">Voltar para usuários</Link>}
    />

    {message ? <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'form-field__error' : 'status-badge status-badge--success'}>{message.text}</p> : null}

    {canManageProfile ? <Card>
      <CardTitle>Perfil do usuário</CardTitle>
      <CardDescription>O perfil-base define os acessos iniciais; exceções individuais são configuradas separadamente.</CardDescription>
      <form action={updateStaffProfileAction} className="settings-form">
        <input type="hidden" name="user_id" value={user.userId} />
        <div className="form-field">
          <label className="form-field__label" htmlFor="profile-display-name">Nome</label>
          <input className="ui-input" id="profile-display-name" name="display_name" required maxLength={160} defaultValue={user.displayName} />
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="profile-role">Perfil-base</label>
          <select className="ui-select" id="profile-role" name="role" defaultValue={user.role}>
            <option value="secretary">Secretaria</option>
            <option value="accounting">Contabilidade</option>
            {session.role === 'psychologist_owner' ? <option value="psychologist_owner">Profissional responsável</option> : null}
          </select>
        </div>
        <label className="choice-control">
          <input className="ui-checkbox" type="checkbox" name="active" defaultChecked={user.active} />
          <span>Usuário ativo</span>
        </label>
        <button className="ui-button ui-button--primary" type="submit">Salvar perfil</button>
      </form>
    </Card> : null}

    {canManagePermissions
      ? <UserAccessEditor user={user} permissions={permissions} saveAction={saveUserPermissionAction} />
      : <Card><CardTitle>Acessos individuais</CardTitle><CardDescription>Seu usuário não tem autorização para alterar permissões por rotina.</CardDescription></Card>}
  </>
}
