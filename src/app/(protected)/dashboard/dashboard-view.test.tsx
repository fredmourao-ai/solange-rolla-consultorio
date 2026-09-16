import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardView } from './dashboard-view'

describe('DashboardView', () => {
  it('renders operational totals with patient-centric copy', () => {
    const html = renderToStaticMarkup(<DashboardView
      upcomingAppointments={3}
      openReceivablesCents={90000}
      upcomingEvents={1}
      peopleCount={3}
    />)
    expect(html).toContain('3 consultas')
    expect(html).toContain('R$ 900,00')
    expect(html).toContain('1 evento')
    expect(html).toContain('3 pacientes')
    expect(html).toContain('Abrir pacientes')
    expect(html).toContain('href="/pessoas"')
  })
})
