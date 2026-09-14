import type { AppPermission } from '../domain/permission'
import type { AppRole } from '../domain/role'

export type StaffUserSummary = {
  userId: string
  displayName: string
  role: AppRole
  active: boolean
  email: string | null
  lastSignInAt: string | null
}

export type UserAccessRow = {
  permissionKey: AppPermission
  area: string
  label: string
  clinical: boolean
  requiresAal2: boolean
  sortOrder: number
  roleDefault: boolean
  overrideAllowed: boolean | null
  effectiveAllowed: boolean
}

type AccessAction = (formData: FormData) => void | Promise<void>

const AREA_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  appointments: 'Agenda',
  clinical: 'Prontuário',
  forms: 'Formulários',
  documents: 'Documentos',
  messaging: 'Comunicação',
  finance: 'Financeiro',
  fiscal: 'Fiscal',
  events: 'Eventos',
  reports: 'Relatórios',
  users: 'Usuários',
  permissions: 'Acessos',
  settings: 'Configurações',
  audit: 'Auditoria',
}

export const ROLE_LABELS: Record<AppRole, string> = {
  psychologist_owner: 'Profissional responsável',
  secretary: 'Secretaria',
  accounting: 'Contabilidade',
}

function modeOf(row: UserAccessRow): 'default' | 'allow' | 'deny' {
  if (row.overrideAllowed === true) return 'allow'
  if (row.overrideAllowed === false) return 'deny'
  return 'default'
}

function groupRows(rows: readonly UserAccessRow[]) {
  const grouped = new Map<string, UserAccessRow[]>()
  for (const row of rows) {
    const areaRows = grouped.get(row.area) ?? []
    areaRows.push(row)
    grouped.set(row.area, areaRows)
  }
  return [...grouped.entries()]
}

export function UserAccessEditor({
  user,
  permissions,
  saveAction,
}: {
  user: StaffUserSummary
  permissions: readonly UserAccessRow[]
  saveAction?: AccessAction
}) {
  return <div className="access-editor">
    <div className="ui-card">
      <h2 className="ui-card__title">Acessos de {user.displayName}</h2>
      <p className="ui-card__description">
        Perfil-base: {ROLE_LABELS[user.role]}. O padrão vem do perfil; permissões individuais podem ser permitidas ou negadas.
      </p>
    </div>

    {groupRows(permissions).map(([area, rows]) => <section className="ui-card" key={area}>
      <h2 className="ui-card__title">{AREA_LABELS[area] ?? area}</h2>
      <div className="access-editor__rows">
        {rows.map((row) => {
          const structuralClinicalBlock = row.clinical && user.role !== 'psychologist_owner'
          const mode = modeOf(row)
          return <div className="access-editor__row" key={row.permissionKey}>
            <div>
              <strong>{row.label}</strong>
              <p>
                {structuralClinicalBlock
                  ? 'Restrito ao perfil profissional por proteção clínica.'
                  : row.requiresAal2
                    ? 'Exige autenticação em duas etapas para uso.'
                    : row.roleDefault
                      ? 'Permitido pelo perfil-base.'
                      : 'Negado pelo perfil-base.'}
              </p>
            </div>
            <span className={`status-badge ${row.effectiveAllowed ? 'status-badge--success' : 'status-badge--neutral'}`}>
              {row.effectiveAllowed ? 'Permitido' : 'Sem acesso'}
            </span>
            {structuralClinicalBlock ? null : <form action={saveAction} className="access-editor__choice">
              <input type="hidden" name="user_id" value={user.userId} />
              <input type="hidden" name="permission_key" value={row.permissionKey} />
              <label>
                <input type="radio" name="mode" value="default" defaultChecked={mode === 'default'} />
                Padrão
              </label>
              <label>
                <input type="radio" name="mode" value="allow" defaultChecked={mode === 'allow'} />
                Permitir
              </label>
              <label>
                <input type="radio" name="mode" value="deny" defaultChecked={mode === 'deny'} />
                Negar
              </label>
              <button className="ui-button ui-button--outline" type="submit">Salvar</button>
            </form>}
          </div>
        })}
      </div>
    </section>)}
  </div>
}
