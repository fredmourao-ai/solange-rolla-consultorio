'use client'

import { useActionState } from 'react'
import { generateFormLinkAction, type GenerateFormLinkState } from './actions'

type Option = { id: string; label: string }

export function FormLinkGenerator({ people, templates }: { people: Option[]; templates: Option[] }) {
  const [state, action, pending] = useActionState<GenerateFormLinkState, FormData>(generateFormLinkAction, {})

  return <form action={action} className="stack-form">
    <label>Pessoa
      <select name="person_id" required defaultValue="">
        <option value="" disabled>Selecione</option>
        {people.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}
      </select>
    </label>
    <label>Formulário
      <select name="template_version_id" required defaultValue="">
        <option value="" disabled>Selecione</option>
        {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
      </select>
    </label>
    <label>Validade do link em horas
      <input name="expires_hours" type="number" min="1" max="168" defaultValue="24" required />
    </label>
    <button type="submit" disabled={pending || people.length === 0 || templates.length === 0}>
      {pending ? 'Gerando…' : 'Gerar link de formulário'}
    </button>
    {state.error ? <p role="alert">Não foi possível gerar o link: {state.error}</p> : null}
    {state.link ? <label>Link seguro<input readOnly value={state.link} /></label> : null}
  </form>
}
