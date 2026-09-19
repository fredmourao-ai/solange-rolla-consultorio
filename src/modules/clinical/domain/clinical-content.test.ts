import { describe, expect, it } from 'vitest'
import { medicalHistoryFields, parseClinicalPayload, parseMedicalHistoryPayload, serializeMedicalHistory, serializeSessionEvolution } from './clinical-content'

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

describe('structured medical history', () => {
  it('keeps reviewed health context inside the encrypted clinical payload', () => {
    const serialized = serializeSessionEvolution({
      evolution: 'Avaliação inicial revisada com a paciente.',
      conditions: 'Hipertensão controlada',
      medications: 'Losartana 50 mg',
      allergies: 'Dipirona',
      surgeries: 'Apendicectomia em 2018',
      familyHistory: 'Histórico familiar de ansiedade',
      lifestyle: 'Não fuma; atividade física 3x/semana',
      involvedProfessionals: 'Cardiologista',
      clinicalAlerts: 'Evitar dipirona',
    })
    expect(JSON.parse(serialized)).toMatchObject({
      conditions: 'Hipertensão controlada',
      medications: 'Losartana 50 mg',
      allergies: 'Dipirona',
      clinicalAlerts: 'Evitar dipirona',
    })
    const parsed = parseClinicalPayload(serialized)
    expect(parsed.fields).toContainEqual({ label: 'Alergias', value: 'Dipirona' })
    expect(parsed.fields).toContainEqual({ label: 'Alertas clínicos', value: 'Evitar dipirona' })
  })
})


describe('dedicated encrypted medical history payload', () => {
  it('serializes and parses a structured medical history independently from session evolution', () => {
    const serialized = serializeMedicalHistory({
      conditions: 'Hipertensão controlada',
      medications: 'Losartana 50 mg',
      allergies: 'Dipirona',
      clinicalAlerts: 'Evitar dipirona',
      notes: 'Autorreporte revisado pela profissional',
    })
    const parsed = parseMedicalHistoryPayload(serialized)
    expect(parsed.kind).toBe('medical_history')
    expect(parsed.allergies).toBe('Dipirona')
    expect(medicalHistoryFields(parsed)).toContainEqual({ label: 'Alertas clínicos', value: 'Evitar dipirona' })
    expect(parseClinicalPayload(serialized).kind).toBe('medical_history')
  })

  it('rejects an empty medical history', () => {
    expect(() => serializeMedicalHistory({})).toThrow('MEDICAL_HISTORY_REQUIRED')
  })
})
