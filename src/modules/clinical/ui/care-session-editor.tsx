'use client'

import { useState } from 'react'

type CareAction = (formData: FormData) => void | Promise<void>

function OptionalField({ name, label, rows = 2 }: { name: string; label: string; rows?: number }) {
  return <label className="form-field">
    <span className="form-field__label">{label}</span>
    <textarea className="ui-textarea" name={name} rows={rows} autoComplete="off" />
  </label>
}

export function CareSessionEditor({
  appointmentId,
  personId,
  action,
}: {
  appointmentId: string
  personId: string
  action: CareAction
}) {
  const [evolution, setEvolution] = useState('')

  return <form className="clinical-editor care-session-editor" action={action}>
    <input type="hidden" name="appointment_id" value={appointmentId} />
    <input type="hidden" name="person_id" value={personId} />

    <label className="form-field">
      <span className="form-field__label">Evolução da sessão</span>
      <textarea
        className="ui-textarea care-session-editor__main"
        name="evolution"
        rows={8}
        value={evolution}
        onChange={(event) => setEvolution(event.target.value)}
        autoComplete="off"
        required
      />
    </label>

    <details className="care-session-editor__optional">
      <summary>Adicionar informações estruturadas</summary>
      <div className="care-session-editor__fields">
        <OptionalField name="themes" label="Temas / demanda trabalhada" />
        <OptionalField name="interventions" label="Procedimentos e intervenções" />
        <OptionalField name="changes" label="Mudanças relevantes desde a última sessão" />
        <OptionalField name="objectives" label="Objetivos e foco terapêutico" />
        <OptionalField name="referrals" label="Encaminhamentos e decisões" />
        <OptionalField name="next_steps" label="Combinações / próximos passos" />
      </div>
    </details>

    <button className="ui-button ui-button--primary" type="submit" disabled={!evolution.trim()}>
      Finalizar atendimento e registrar evolução
    </button>
    <p className="form-field__help">O conteúdo clínico é cifrado antes de ser persistido. A Secretaria não recebe esta evolução.</p>
  </form>
}
