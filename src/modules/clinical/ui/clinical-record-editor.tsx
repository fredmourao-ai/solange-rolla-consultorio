'use client'

import { useState } from 'react'

type ClinicalRecordAction = (formData: FormData) => void | Promise<void>

export function ClinicalRecordEditor({
  personId,
  action,
  appointmentId = '',
  initialText = '',
}: {
  personId: string
  action: ClinicalRecordAction
  appointmentId?: string
  initialText?: string
}) {
  const [text, setText] = useState(initialText)

  return (
    <form className="clinical-editor" action={action}>
      <input type="hidden" name="person_id" value={personId} />
      <label className="form-field">
        <span className="form-field__label">ID do atendimento</span>
        <input className="ui-input" name="appointment_id" defaultValue={appointmentId} required />
      </label>
      <label className="form-field">
        <span className="form-field__label">Registro atual</span>
        <textarea
          className="ui-textarea"
          name="plaintext"
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <button className="ui-button ui-button--primary" type="submit">Criar nova versão</button>
    </form>
  )
}
