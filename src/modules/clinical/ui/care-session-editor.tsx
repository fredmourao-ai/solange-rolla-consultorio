'use client'

import { useState } from 'react'
import type { HandoffTaskType } from '../application/complete-appointment-with-handoff'

type CareAction = (formData: FormData) => void | Promise<void>
type SecretaryOption = { userId: string; displayName: string | null }

export const HANDOFF_TYPE_OPTIONS: readonly { value: HandoffTaskType; label: string }[] = [
  { value: 'schedule_follow_up', label: 'Agendar retorno' },
  { value: 'contact_patient', label: 'Entrar em contato com o paciente' },
  { value: 'resend_form', label: 'Reenviar formulário' },
  { value: 'other_admin', label: 'Outra pendência administrativa' },
]

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
  secretaries = [],
  initialHandoffType = '',
}: {
  appointmentId: string
  personId: string
  action: CareAction
  secretaries?: SecretaryOption[]
  initialHandoffType?: '' | HandoffTaskType
}) {
  const [evolution, setEvolution] = useState('')
  const [handoffType, setHandoffType] = useState<'' | HandoffTaskType>(initialHandoffType)

  return <form className="clinical-editor care-session-editor" action={action}>
    <input type="hidden" name="appointment_id" value={appointmentId} />
    <input type="hidden" name="person_id" value={personId} />

    <label className="form-field">
      <span className="form-field__label">Evolução da sessão</span>
      <textarea className="ui-textarea care-session-editor__main" name="evolution" rows={8} value={evolution}
        onChange={(event) => setEvolution(event.target.value)} autoComplete="off" required />
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

    <fieldset className="form-field">
      <legend>Próximo passo administrativo (opcional)</legend>
      <label className="form-field">
        <span className="form-field__label">Próximo passo</span>
        <select className="ui-input" name="handoff_type" value={handoffType}
          onChange={(event) => setHandoffType(event.target.value as '' | HandoffTaskType)}>
          <option value="">Nenhum</option>
          {HANDOFF_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {handoffType ? <label className="form-field">
        <span className="form-field__label">Atribuir à secretaria</span>
        <select className="ui-input" name="handoff_assigned_to" required>
          <option value="">Selecione</option>
          {secretaries.map((secretary) => <option key={secretary.userId} value={secretary.userId}>{secretary.displayName ?? secretary.userId}</option>)}
        </select>
      </label> : null}
      {handoffType === 'schedule_follow_up' ? <label className="form-field">
        <span className="form-field__label">Retornar em quantos dias</span>
        <input className="ui-input" type="number" name="handoff_follow_up_days" min={1} max={180} required />
      </label> : null}
    </fieldset>

    <button className="ui-button ui-button--primary" type="submit" disabled={!evolution.trim()}>
      Finalizar atendimento e registrar evolução
    </button>
    <p className="form-field__help">O conteúdo clínico é cifrado antes de ser persistido. A Secretaria recebe somente a tarefa administrativa selecionada.</p>
  </form>
}
