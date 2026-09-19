import {
  medicalHistoryFields,
  parseMedicalHistoryPayload,
  type MedicalHistoryPayload,
} from '../domain/clinical-content'

export type ReadableMedicalHistory = {
  id: string
  personId: string
  revision: number
  sourceType: 'clinician_review' | 'patient_signed_form_review'
  sourceReferenceId?: string
  supersedesId?: string
  createdAt: string
  plaintext: string
}

type MedicalHistoryAction = (formData: FormData) => void | Promise<void>

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

export function getCurrentMedicalHistory(records: readonly ReadableMedicalHistory[]) {
  if (!records.length) return null
  const superseded = new Set(records.flatMap((record) => record.supersedesId ? [record.supersedesId] : []))
  return [...records]
    .filter((record) => !superseded.has(record.id))
    .sort((a, b) => b.revision - a.revision)[0] ?? null
}

function Field({
  name,
  label,
  value,
  rows = 2,
}: {
  name: keyof Omit<MedicalHistoryPayload, 'version' | 'kind'>
  label: string
  value?: string
  rows?: number
}) {
  return <label className="form-field">
    <span className="form-field__label">{label}</span>
    <textarea className="ui-textarea" name={name} rows={rows} defaultValue={value ?? ''} autoComplete="off" />
  </label>
}

export function MedicalHistoryPanel({
  personId,
  records,
  action,
}: {
  personId: string
  records: readonly ReadableMedicalHistory[]
  action: MedicalHistoryAction
}) {
  const current = getCurrentMedicalHistory(records)
  const values = current ? parseMedicalHistoryPayload(current.plaintext) : null

  return <section className="ui-card" aria-labelledby="medical-history-title">
    <h2 className="ui-card__title" id="medical-history-title">Histórico médico / anamnese</h2>
    <p className="ui-card__description">
      Contexto de saúde revisado pela psicóloga. Respostas do paciente só entram aqui após revisão profissional e permanecem identificadas como fonte.
    </p>

    {current ? <p><strong>Revisão atual:</strong> {current.revision} · {dateTime.format(new Date(current.createdAt))}</p>
      : <p className="empty-state">Nenhuma anamnese clínica revisada foi registrada ainda.</p>}

    <form className="clinical-editor" action={action}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="supersedes_id" value={current?.id ?? ''} />
      <fieldset className="form-field">
        <legend>Origem da informação</legend>
        <label className="form-field">
          <span className="form-field__label">Fonte revisada</span>
          <select className="ui-input" name="source_type" defaultValue={current?.sourceType ?? 'clinician_review'}>
            <option value="clinician_review">Entrevista / revisão clínica</option>
            <option value="patient_signed_form_review">Formulário assinado pelo paciente, revisado pela profissional</option>
          </select>
        </label>
        <label className="form-field">
          <span className="form-field__label">ID da fonte assinada (opcional)</span>
          <input className="ui-input" name="source_reference_id" defaultValue={current?.sourceReferenceId ?? ''} autoComplete="off" />
        </label>
      </fieldset>
      <div className="care-session-editor__fields">
        <Field name="conditions" label="Condições de saúde relevantes" value={values?.conditions} />
        <Field name="medications" label="Medicamentos em uso" value={values?.medications} />
        <Field name="allergies" label="Alergias" value={values?.allergies} />
        <Field name="surgeries" label="Cirurgias e internações" value={values?.surgeries} />
        <Field name="familyHistory" label="Antecedentes familiares" value={values?.familyHistory} />
        <Field name="lifestyle" label="Hábitos e substâncias" value={values?.lifestyle} />
        <Field name="involvedProfessionals" label="Profissionais de saúde envolvidos" value={values?.involvedProfessionals} />
        <Field name="clinicalAlerts" label="Alertas clínicos" value={values?.clinicalAlerts} />
        <Field name="notes" label="Observações clínicas" value={values?.notes} rows={4} />
      </div>
      <button className="ui-button ui-button--primary" type="submit">
        {current ? 'Salvar nova revisão da anamnese' : 'Registrar anamnese clínica'}
      </button>
      <p className="form-field__help">Cada alteração cria uma nova revisão cifrada. Revisões anteriores não são sobrescritas nem apagadas.</p>
    </form>

    {records.length ? <details>
      <summary>Ver histórico de revisões da anamnese</summary>
      <ol className="clinical-history">
        {[...records].sort((a, b) => b.revision - a.revision).map((record) => {
          const payload = parseMedicalHistoryPayload(record.plaintext)
          return <li key={record.id}>
            <p><strong>Revisão {record.revision}</strong> · {dateTime.format(new Date(record.createdAt))}</p>
            <p>Fonte: {record.sourceType === 'patient_signed_form_review' ? 'Formulário assinado revisado' : 'Entrevista / revisão clínica'}</p>
            <div className="clinical-history__content">
              {medicalHistoryFields(payload).map((field) => <section key={field.label}>
                <h4>{field.label}</h4>
                <p className="clinical-history__text">{field.value}</p>
              </section>)}
            </div>
          </li>
        })}
      </ol>
    </details> : null}
  </section>
}
