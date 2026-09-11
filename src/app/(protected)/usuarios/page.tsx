import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStaffSession, hasSessionPermission, isAppRole } from '@/modules/identity/public'
import { ROLE_LABELS, type StaffUserSummary } from '@/modules/identity/ui/user-access-editor'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { inviteStaffUserAction } from './actions'

type RawStaffUser = {
  user_id: string
  display_name: string
  role: string
  active: boolean
  email: string | null
  last_sign_in_at: string | null
}

function message(search: { status?: string; error?: string }) {
  if (search.status === 'invite_sent') return { kind: 'success', text: 'Convite enviado e acesso inicial criado.' }
  if (search.error === 'invalid_user') return { kind: 'error', text: 'Confira nome, e-mail e perfil do novo usuário.' }
  if (search.error === 'invite_failed') return { kind: 'error', text: 'Não foi possível enviar o convite. Verifique se o e-mail já está cadastrado.' }
  if (search.error === 'profile_failed') return { kind: 'error', text: 'O convite não foi concluído porque o perfil de acesso não pôde ser criado.' }
  return null
}

function formatDate(value: string | null) {
  if (!value) return 'Ainda não acessou'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (!hasSessionPermission(session, 'users.read') && !hasSessionPermission(session, 'permissions.manage')) redirect('/dashboard')

  const client = await createServerSupabaseClient()
  const { data, error } = await client.rpc('list_staff_users' as never)
  if (error) throw new Error('STAFF_LIST_FAILED')

  const users: StaffUserSummary[] = ((data ?? []) as unknown as RawStaffUser[])
    .filter((row) => isAppRole(row.role))
    .map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      role: row.role as StaffUserSummary['role'],
      active: row.active,
      email: row.email,
      lastSignInAt: row.last_sign_in_at,
    }))
  const search = await searchParams
  const feedback = message(search)
  const canManageUsers = hasSessionPermission(session, 'users.manage')

  return <>
    <PageHeader
      title="Usuários e acessos"
      description="Cadastre a equipe e controle o que cada pessoa pode visualizar ou executar."
      actions={session.aal !== 'aal2' && session.role === 'psychologist_owner'
        ? <Link className="ui-button ui-button--outline" href="/seguranca?reason=mfa_required&returnTo=%2Fusuarios">Confirmar segurança</Link>
        : undefined}
    />

    {feedback ? <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={feedback.kind === 'error' ? 'form-field__error' : 'status-badge status-badge--success'}>{feedback.text}</p> : null}

    {canManageUsers ? <Card>
      <CardTitle>Adicionar usuário</CardTitle>
      <CardDescription>O usuário receberá um convite por e-mail para criar o próprio acesso.</CardDescription>
      <form action={inviteStaffUserAction} className="settings-form">
        <div className="form-field">
          <label className="form-field__label" htmlFor="staff-name">Nome</label>
          <input className="ui-input" id="staff-name" name="display_name" required maxLength={160} />
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="staff-email">E-mail</label>
          <input className="ui-input" id="staff-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="staff-role">Perfil-base</label>
          <select className="ui-select" id="staff-role" name="role" defaultValue="secretary">
            <option value="secretary">Secretaria</option>
            <option value="accounting">Contabilidade</option>
            {session.role === 'psychologist_owner' ? <option value="psychologist_owner">Profissional responsável</option> : null}
          </select>
        </div>
        <button className="ui-button ui-button--primary" type="submit">Enviar convite</button>
      </form>
    </Card> : null}

    <section className="ui-card staff-users" aria-labelledby="staff-list-title">
      <h2 className="ui-card__title" id="staff-list-title">Equipe</h2>
      {users.length === 0 ? <p className="ui-card__description">Nenhum usuário cadastrado.</p> : <ul className="staff-users__list">
        {users.map((user) => <li key={user.userId}>
          <div>
            <strong>{user.displayName}</strong>
            <span>{user.email ?? 'E-mail indisponível'}</span>
          </div>
          <div>
            <span>{ROLE_LABELS[user.role]}</span>
            <span className={`status-badge ${user.active ? 'status-badge--success' : 'status-badge--neutral'}`}>{user.active ? 'Ativo' : 'Inativo'}</span>
          </div>
          <small>Último acesso: {formatDate(user.lastSignInAt)}</small>
          <Link className="ui-button ui-button--outline" href={`/usuarios/${user.userId}`}>Gerenciar acessos</Link>
        </li>)}
      </ul>}
    </section>
  </>
}
