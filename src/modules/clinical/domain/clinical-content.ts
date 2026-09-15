export type ClinicalRecordKind =
  | 'session_evolution'
  | 'initial_assessment'
  | 'treatment_objectives'
  | 'referral'
  | 'closure'
  | 'clinical_note'

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
  }
  if (!payload.evolution) throw new Error('CLINICAL_EVOLUTION_REQUIRED')
  return JSON.stringify(payload)
}

export function parseClinicalPayload(plaintext: string): { kind: ClinicalRecordKind; fields: Array<{ label: string; value: string }> } {
  try {
    const value = JSON.parse(plaintext) as Partial<SessionEvolutionPayload>
    if (value.version === 1 && value.kind === 'session_evolution' && typeof value.evolution === 'string') {
      const entries: Array<[string, unknown]> = [
        ['Evolução da sessão', value.evolution],
        ['Temas trabalhados', value.themes],
        ['Procedimentos e intervenções', value.interventions],
        ['Mudanças relevantes', value.changes],
        ['Objetivos e foco', value.objectives],
        ['Encaminhamentos e decisões', value.referrals],
        ['Próximos passos', value.nextSteps],
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
  initial_assessment: 'Avaliação inicial',
  treatment_objectives: 'Objetivos do acompanhamento',
  referral: 'Encaminhamento',
  closure: 'Encerramento',
  clinical_note: 'Registro clínico',
}
