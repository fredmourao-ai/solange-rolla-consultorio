import type { ClinicalRecordMetadata } from '../application/list-clinical-records'

export function ClinicalTimeline({ records }: { records: ClinicalRecordMetadata[] }) {
  if (records.length === 0) {
    return <p className="clinical-timeline__empty">Nenhum registro clínico disponível.</p>
  }

  return (
    <ol className="clinical-timeline">
      {records.map((record) => (
        <li key={record.id}>
          <strong>{new Date(record.createdAt).toLocaleDateString('pt-BR')}</strong>
          <span>Atendimento {record.appointmentId}</span>
          {record.supersedesId && <small>Versão posterior a {record.supersedesId}</small>}
        </li>
      ))}
    </ol>
  )
}
