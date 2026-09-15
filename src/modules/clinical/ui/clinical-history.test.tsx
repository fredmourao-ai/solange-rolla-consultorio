import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClinicalHistory } from './clinical-history'

describe('ClinicalHistory', () => {
  it('shows human session history without internal identifiers', () => {
    const html = renderToStaticMarkup(<ClinicalHistory records={[{
      id: 'record-internal-1',
      appointmentId: 'appointment-internal-1',
      createdAt: '2026-09-03T18:00:00.000Z',
      appointmentLabel: 'Psicoterapia · 03/09/2026, 15:00',
      plaintext: JSON.stringify({
        version: 1,
        kind: 'session_evolution',
        evolution: 'Evolução sintética da sessão.',
        objectives: 'Objetivo sintético.',
      }),
    }]} />)

    expect(html).toContain('Evolução de sessão')
    expect(html).toContain('Evolução sintética da sessão.')
    expect(html).toContain('Objetivo sintético.')
    expect(html).toContain('Psicoterapia')
    expect(html).not.toContain('record-internal-1')
    expect(html).not.toContain('appointment-internal-1')
  })

  it('shows only the current version when a record supersedes another', () => {
    const html = renderToStaticMarkup(<ClinicalHistory records={[
      {
        id: 'new-record', appointmentId: 'apt-1', supersedesId: 'old-record',
        createdAt: '2026-09-04T18:00:00.000Z', plaintext: 'Versão corrigida',
      },
      {
        id: 'old-record', appointmentId: 'apt-1',
        createdAt: '2026-09-03T18:00:00.000Z', plaintext: 'Versão antiga',
      },
    ]} />)

    expect(html).toContain('Versão corrigida')
    expect(html).toContain('Registro corrigido')
    expect(html).not.toContain('Versão antiga')
  })
})
