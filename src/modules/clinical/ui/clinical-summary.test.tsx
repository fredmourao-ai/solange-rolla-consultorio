import { describe, expect, it } from 'vitest'
import { buildClinicalSummary } from './clinical-summary'

describe('clinical longitudinal summary', () => {
  it('uses the latest reviewed values without exposing superseded records', () => {
    const records = [
      { id:'old', appointmentId:'a1', createdAt:'2026-01-01T00:00:00Z', plaintext: JSON.stringify({version:1,kind:'session_evolution',evolution:'x',allergies:'Dipirona'}) },
      { id:'new', appointmentId:'a2', createdAt:'2026-02-01T00:00:00Z', plaintext: JSON.stringify({version:1,kind:'session_evolution',evolution:'y',allergies:'Penicilina',clinicalAlerts:'Revisado'}) },
    ]
    expect(buildClinicalSummary(records)).toContainEqual({label:'Alergias',value:'Penicilina'})
    expect(buildClinicalSummary(records)).not.toContainEqual({label:'Alergias',value:'Dipirona'})
  })

  it('prefers the dedicated current medical history over session copies', () => {
    const sessions = [
      { id:'session', appointmentId:'a1', createdAt:'2026-03-01T00:00:00Z', plaintext: JSON.stringify({version:1,kind:'session_evolution',evolution:'x',allergies:'Sessão antiga'}) },
    ]
    const histories = [
      { id:'history', personId:'p1', revision:1, sourceType:'clinician_review' as const, createdAt:'2026-02-01T00:00:00Z', plaintext: JSON.stringify({version:1,kind:'medical_history',allergies:'Anamnese atual'}) },
    ]
    expect(buildClinicalSummary(sessions, histories)).toContainEqual({label:'Alergias',value:'Anamnese atual'})
  })
})
