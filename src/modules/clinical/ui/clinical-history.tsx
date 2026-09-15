import { CLINICAL_KIND_LABELS, parseClinicalPayload } from '../domain/clinical-content'

export type ReadableClinicalRecord = {
  id: string
  appointmentId: string
  createdAt: string
  supersedesId?: string
  plaintext: string
  appointmentLabel?: string
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

export function ClinicalHistory({ records }: { records: readonly ReadableClinicalRecord[] }) {
  if (records.length === 0) return <p className="empty-state">Ainda não há registros clínicos neste acompanhamento.</p>

  const superseded = new Set(records.flatMap((record) => record.supersedesId ? [record.supersedesId] : []))
  const current = records.filter((record) => !superseded.has(record.id))

  return <ol className="clinical-history">
    {current.map((record) => {
      const payload = parseClinicalPayload(record.plaintext)
      return <li key={record.id}>
        <details>
          <summary>
            <strong>{CLINICAL_KIND_LABELS[payload.kind]}</strong>
            <span>{dateTime.format(new Date(record.createdAt))}</span>
            {record.appointmentLabel ? <span>{record.appointmentLabel}</span> : null}
            {record.supersedesId ? <span className="status-badge">Registro corrigido</span> : null}
          </summary>
          <div className="clinical-history__content">
            {payload.fields.map((field) => <section key={field.label}>
              <h4>{field.label}</h4>
              <p className="clinical-history__text">{field.value}</p>
            </section>)}
          </div>
        </details>
      </li>
    })}
  </ol>
}
