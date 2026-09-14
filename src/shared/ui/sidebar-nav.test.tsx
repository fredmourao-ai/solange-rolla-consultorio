import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SidebarNav } from './sidebar-nav'

describe('SidebarNav', () => {
  it('uses Pacientes as the operational label and filters routes by effective access', () => {
    const html = renderToStaticMarkup(<SidebarNav permissions={[
      'patients.read',
      'appointments.read',
      'forms.read',
    ]} />)

    expect(html).toContain('href="/pessoas"')
    expect(html).toContain('>Pacientes<')
    expect(html).not.toContain('>Pessoas<')
    expect(html).toContain('href="/agenda"')
    expect(html).toContain('href="/formularios"')
    expect(html).not.toContain('href="/financeiro"')
    expect(html).not.toContain('href="/fiscal"')
    expect(html).not.toContain('href="/usuarios"')
  })

  it('shows user administration when any relevant administration capability is effective', () => {
    const usersRead = renderToStaticMarkup(<SidebarNav permissions={['users.read']} />)
    const usersManage = renderToStaticMarkup(<SidebarNav permissions={['users.manage']} />)
    const permissionsManage = renderToStaticMarkup(<SidebarNav permissions={['permissions.manage']} />)

    expect(usersRead).toContain('href="/usuarios"')
    expect(usersManage).toContain('href="/usuarios"')
    expect(permissionsManage).toContain('href="/usuarios"')
  })

  it('fails closed for routine links when no permission list is available', () => {
    const html = renderToStaticMarkup(<SidebarNav />)

    expect(html).toContain('href="/dashboard"')
    expect(html).not.toContain('href="/pessoas"')
    expect(html).not.toContain('href="/agenda"')
    expect(html).not.toContain('href="/clinical"')
  })
})
