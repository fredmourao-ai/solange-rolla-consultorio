import { medicalHistoryFields, parseClinicalPayload, parseMedicalHistoryPayload } from '../domain/clinical-content'
import { getCurrentMedicalHistory, type ReadableMedicalHistory } from './medical-history'
import type { ReadableClinicalRecord } from './clinical-history'

const SUMMARY_LABELS = [
  'Condições de saúde relevantes',
  'Medicamentos em uso',
  'Alergias',
  'Cirurgias e internações',
  'Antecedentes familiares',
  'Hábitos e substâncias',
  'Profissionais de saúde envolvidos',
  'Alertas clínicos',
  'Objetivos e foco',
  'Encaminhamentos e decisões',
  'Próximos passos',
] as const

export function buildClinicalSummary(records: readonly ReadableClinicalRecord[], medicalHistories: readonly ReadableMedicalHistory[] = []) {
  const superseded = new Set(records.flatMap((record) => record.supersedesId ? [record.supersedesId] : []))
  const current = records.filter((record) => !superseded.has(record.id))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const values = new Map<string, string>()
  const currentMedicalHistory = getCurrentMedicalHistory(medicalHistories)
  if (currentMedicalHistory) {
    for (const field of medicalHistoryFields(parseMedicalHistoryPayload(currentMedicalHistory.plaintext))) {
      values.set(field.label, field.value)
    }
  }
  for (const record of current) {
    for (const field of parseClinicalPayload(record.plaintext).fields) {
      if (SUMMARY_LABELS.includes(field.label as typeof SUMMARY_LABELS[number]) && !values.has(field.label)) {
        values.set(field.label, field.value)
      }
    }
  }
  return SUMMARY_LABELS.flatMap((label) => values.has(label) ? [{ label, value: values.get(label)! }] : [])
}

export function ClinicalSummary({ records, medicalHistories = [] }: { records: readonly ReadableClinicalRecord[]; medicalHistories?: readonly ReadableMedicalHistory[] }) {
  const fields = buildClinicalSummary(records, medicalHistories)
  if (!fields.length) return <p className="empty-state">Resumo clínico ainda não preenchido.</p>
  return <dl className="clinical-summary">
    {fields.map((field) => <div key={field.label}><dt><strong>{field.label}</strong></dt><dd>{field.value}</dd></div>)}
  </dl>
}
