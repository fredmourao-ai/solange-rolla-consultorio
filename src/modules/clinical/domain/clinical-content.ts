export type ClinicalRecordKind =
  | 'session_evolution'
  | 'medical_history'
  | 'initial_assessment'
  | 'treatment_objectives'
  | 'referral'
  | 'closure'
  | 'clinical_note'


export type MedicalHistoryPayload = {
  version: 1
  kind: 'medical_history'
  conditions?: string
  medications?: string
  allergies?: string
  surgeries?: string
  familyHistory?: string
  lifestyle?: string
  involvedProfessionals?: string
  clinicalAlerts?: string
  notes?: string
}

const MEDICAL_HISTORY_FIELD_LABELS: Array<[keyof Omit<MedicalHistoryPayload, 'version' | 'kind'>, string]> = [
  ['conditions', 'Condições de saúde relevantes'],
  ['medications', 'Medicamentos em uso'],
  ['allergies', 'Alergias'],
  ['surgeries', 'Cirurgias e internações'],
  ['familyHistory', 'Antecedentes familiares'],
  ['lifestyle', 'Hábitos e substâncias'],
  ['involvedProfessionals', 'Profissionais de saúde envolvidos'],
  ['clinicalAlerts', 'Alertas clínicos'],
  ['notes', 'Observações clínicas'],
]

export function serializeMedicalHistory(input: Omit<MedicalHistoryPayload, 'version' | 'kind'>) {
  const normalized = Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) => typeof value === 'string' && value.trim() ? [[key, value.trim()]] : []),
  ) as Omit<MedicalHistoryPayload, 'version' | 'kind'>
  if (Object.keys(normalized).length === 0) throw new Error('MEDICAL_HISTORY_REQUIRED')
  return JSON.stringify({ version: 1, kind: 'medical_history', ...normalized } satisfies MedicalHistoryPayload)
}

export function parseMedicalHistoryPayload(plaintext: string): MedicalHistoryPayload {
  let value: Partial<MedicalHistoryPayload>
  try {
    value = JSON.parse(plaintext) as Partial<MedicalHistoryPayload>
  } catch {
    throw new Error('MEDICAL_HISTORY_INVALID')
  }
  if (value.version !== 1 || value.kind !== 'medical_history') throw new Error('MEDICAL_HISTORY_INVALID')
  const normalized: MedicalHistoryPayload = { version: 1, kind: 'medical_history' }
  for (const [key] of MEDICAL_HISTORY_FIELD_LABELS) {
    const field = value[key]
    if (typeof field === 'string' && field.trim()) normalized[key] = field.trim()
  }
  if (Object.keys(normalized).length === 2) throw new Error('MEDICAL_HISTORY_REQUIRED')
  return normalized
}

export function medicalHistoryFields(payload: MedicalHistoryPayload) {
  return MEDICAL_HISTORY_FIELD_LABELS.flatMap(([key, label]) => payload[key]
    ? [{ label, value: payload[key] as string }]
    : [])
}

export type SessionEvolutionPayload = {
  version: 1
  kind: 'session_evolution'
  evolution: string
  themes?: string
  interventions?: string
  changes?: string
  objectives?: string
  referrals?: string
  nextSteps?: string
  conditions?: string
  medications?: string
  allergies?: string
  surgeries?: string
  familyHistory?: string
  lifestyle?: string
  involvedProfessionals?: string
  clinicalAlerts?: string
}

export function serializeSessionEvolution(input: Omit<SessionEvolutionPayload, 'version' | 'kind'>) {
  const payload: SessionEvolutionPayload = {
    version: 1,
    kind: 'session_evolution',
    evolution: input.evolution.trim(),
    ...(input.themes?.trim() ? { themes: input.themes.trim() } : {}),
    ...(input.interventions?.trim() ? { interventions: input.interventions.trim() } : {}),
    ...(input.changes?.trim() ? { changes: input.changes.trim() } : {}),
    ...(input.objectives?.trim() ? { objectives: input.objectives.trim() } : {}),
    ...(input.referrals?.trim() ? { referrals: input.referrals.trim() } : {}),
    ...(input.nextSteps?.trim() ? { nextSteps: input.nextSteps.trim() } : {}),
    ...(input.conditions?.trim() ? { conditions: input.conditions.trim() } : {}),
    ...(input.medications?.trim() ? { medications: input.medications.trim() } : {}),
    ...(input.allergies?.trim() ? { allergies: input.allergies.trim() } : {}),
    ...(input.surgeries?.trim() ? { surgeries: input.surgeries.trim() } : {}),
    ...(input.familyHistory?.trim() ? { familyHistory: input.familyHistory.trim() } : {}),
    ...(input.lifestyle?.trim() ? { lifestyle: input.lifestyle.trim() } : {}),
    ...(input.involvedProfessionals?.trim() ? { involvedProfessionals: input.involvedProfessionals.trim() } : {}),
    ...(input.clinicalAlerts?.trim() ? { clinicalAlerts: input.clinicalAlerts.trim() } : {}),
  }
  if (!payload.evolution) throw new Error('CLINICAL_EVOLUTION_REQUIRED')
  return JSON.stringify(payload)
}

export function parseClinicalPayload(plaintext: string): { kind: ClinicalRecordKind; fields: Array<{ label: string; value: string }> } {
  try {
    const value = JSON.parse(plaintext) as Record<string, unknown>
    if (value.version === 1 && value.kind === 'medical_history') {
      const history = parseMedicalHistoryPayload(plaintext)
      return { kind: 'medical_history', fields: medicalHistoryFields(history) }
    }
    if (value.version === 1 && value.kind === 'session_evolution' && typeof value.evolution === 'string') {
      const entries: Array<[string, unknown]> = [
        ['Evolução da sessão', value.evolution],
        ['Temas trabalhados', value.themes],
        ['Procedimentos e intervenções', value.interventions],
        ['Mudanças relevantes', value.changes],
        ['Objetivos e foco', value.objectives],
        ['Encaminhamentos e decisões', value.referrals],
        ['Próximos passos', value.nextSteps],
        ['Condições de saúde relevantes', value.conditions],
        ['Medicamentos em uso', value.medications],
        ['Alergias', value.allergies],
        ['Cirurgias e internações', value.surgeries],
        ['Antecedentes familiares', value.familyHistory],
        ['Hábitos e substâncias', value.lifestyle],
        ['Profissionais de saúde envolvidos', value.involvedProfessionals],
        ['Alertas clínicos', value.clinicalAlerts],
      ]
      return {
        kind: 'session_evolution',
        fields: entries
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
          .map(([label, fieldValue]) => ({ label, value: fieldValue })),
      }
    }
  } catch {
    // Legacy records can be free text. They remain readable without rewriting history.
  }
  return { kind: 'clinical_note', fields: [{ label: 'Registro', value: plaintext }] }
}

export const CLINICAL_KIND_LABELS: Record<ClinicalRecordKind, string> = {
  session_evolution: 'Evolução de sessão',
  medical_history: 'Histórico médico / anamnese',
  initial_assessment: 'Avaliação inicial',
  treatment_objectives: 'Objetivos do acompanhamento',
  referral: 'Encaminhamento',
  closure: 'Encerramento',
  clinical_note: 'Registro clínico',
}
