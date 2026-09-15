import { describe, expect, it } from 'vitest'
import { parseClinicalPayload, serializeSessionEvolution } from './clinical-content'

describe('clinical-content', () => {
  it('serializes structured session fields inside a single clinical payload', () => {
    const serialized = serializeSessionEvolution({
      evolution: 'Paciente relatou melhora do sono.',
      themes: 'Rotina e trabalho',
      interventions: 'Psicoeducação',
      changes: '',
      objectives: 'Manter higiene do sono',
      referrals: '',
      nextSteps: 'Reavaliar na próxima sessão',
    })
    const parsed = JSON.parse(serialized)

    expect(parsed).toMatchObject({
      version: 1,
      kind: 'session_evolution',
      evolution: 'Paciente relatou melhora do sono.',
      themes: 'Rotina e trabalho',
      interventions: 'Psicoeducação',
      objectives: 'Manter higiene do sono',
      nextSteps: 'Reavaliar na próxima sessão',
    })
    expect(parsed).not.toHaveProperty('changes')
    expect(parsed).not.toHaveProperty('referrals')
  })

  it('requires a real evolution and keeps legacy free text readable', () => {
    expect(() => serializeSessionEvolution({ evolution: '   ' })).toThrow('CLINICAL_EVOLUTION_REQUIRED')
    expect(parseClinicalPayload('Registro antigo em texto livre')).toEqual({
      kind: 'clinical_note',
      fields: [{ label: 'Registro', value: 'Registro antigo em texto livre' }],
    })
  })
})
