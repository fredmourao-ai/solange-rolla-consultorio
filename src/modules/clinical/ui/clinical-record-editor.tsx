'use client'

import { useState } from 'react'
import type { HandoffTaskType } from '../application/complete-appointment-with-handoff'

type ClinicalRecordAction = (formData: FormData) => void | Promise<void>

type SecretaryOption = {
  userId: string
  displayName: string | null
}

export const HANDOFF_TYPE_OPTIONS: readonly { value: HandoffTaskType; label: string }[] = [
  { value: 'schedule_follow_up', label: 'Agendar retorno' },
  { value: 'contact_patient', label: 'Entrar em contato com o paciente' },
  { value: 'resend_form', label: 'Reenviar formulário' },
  { value: 'other_admin', label: 'Outra pendência administrativa' },
]

export function requiresHandoffAssignee(type: '' | HandoffTaskType): boolean {
  return type !== ''
}

export function requiresFollowUpDays(type: '' | HandoffTaskType): boolean {
  return type === 'schedule_follow_up'
}

export function ClinicalRecordEditor({
  personId,
  action,
  appointmentId = '',
  initialText = '',
  secretaries = [],
  initialHandoffType = '',
}: {
  personId: string
  action: ClinicalRecordAction
  appointmentId?: string
  initialText?: string
  secretaries?: SecretaryOption[]
  initialHandoffType?: '' | HandoffTaskType
}) {
  const [text, setText] = useState(initialText)
  const [handoffType, setHandoffType] = useState<'' | HandoffTaskType>(initialHandoffType)

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

      <fieldset className="form-field">
        <legend>Próximo passo administrativo (opcional)</legend>
        <label className="form-field">
          <span className="form-field__label">Próximo passo</span>
          <select
            className="ui-input"
            name="handoff_type"
            value={handoffType}
            onChange={(event) => setHandoffType(event.target.value as '' | HandoffTaskType)}
          >
            <option value="">Nenhum</option>
            {HANDOFF_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {requiresHandoffAssignee(handoffType) && (
          <label className="form-field">
            <span className="form-field__label">Atribuir à secretaria</span>
            <select className="ui-input" name="handoff_assigned_to" required>
              <option value="">Selecione</option>
              {secretaries.map((secretary) => (
                <option key={secretary.userId} value={secretary.userId}>
                  {secretary.displayName ?? secretary.userId}
                </option>
              ))}
            </select>
          </label>
        )}

        {requiresFollowUpDays(handoffType) && (
          <label className="form-field">
            <span className="form-field__label">Retornar em quantos dias</span>
            <input className="ui-input" type="number" name="handoff_follow_up_days" min={1} max={180} required />
          </label>
        )}
      </fieldset>

      <button className="ui-button ui-button--primary" type="submit">Concluir atendimento</button>
    </form>
  )
}
