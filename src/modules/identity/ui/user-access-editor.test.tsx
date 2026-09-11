import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UserAccessEditor, type StaffUserSummary, type UserAccessRow } from './user-access-editor'

const user: StaffUserSummary = {
  userId: 'user-1',
  displayName: 'Maria Secretaria',
  role: 'secretary',
  active: true,
  email: 'maria@example.test',
  lastSignInAt: null,
}

const permissions: UserAccessRow[] = [
  {
    permissionKey: 'patients.update', area: 'patients', label: 'Atualizar pacientes',
    clinical: false, requiresAal2: false, sortOrder: 10, roleDefault: true,
    overrideAllowed: null, effectiveAllowed: true,
  },
  {
    permissionKey: 'appointments.create', area: 'appointments', label: 'Criar consultas',
    clinical: false, requiresAal2: false, sortOrder: 20, roleDefault: true,
    overrideAllowed: false, effectiveAllowed: false,
  },
  {
    permissionKey: 'clinical.read', area: 'clinical', label: 'Visualizar prontuário',
    clinical: true, requiresAal2: true, sortOrder: 30, roleDefault: false,
    overrideAllowed: null, effectiveAllowed: false,
  },
]

describe('UserAccessEditor', () => {
  it('groups permissions with human labels and shows inherited/override result', () => {
    const html = renderToStaticMarkup(<UserAccessEditor user={user} permissions={permissions} />)

    expect(html).toContain('Pacientes')
    expect(html).toContain('Agenda')
    expect(html).toContain('Prontuário')
    expect(html).toContain('Atualizar pacientes')
    expect(html).toContain('Criar consultas')
    expect(html).toContain('Perfil-base: Secretaria')
    expect(html).toContain('Permitido')
    expect(html).toContain('Sem acesso')
    expect(html).not.toContain('patients.update')
  })

  it('does not offer a configurable clinical bypass to a secretary', () => {
    const html = renderToStaticMarkup(<UserAccessEditor user={user} permissions={permissions} />)

    expect(html).toContain('Restrito ao perfil profissional por proteção clínica.')
    expect(html).not.toContain('value="clinical.read"')
  })
})
