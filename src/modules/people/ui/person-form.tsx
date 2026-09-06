'use client'

import { useActionState } from 'react'

export type PersonFormValues = {
  civil_name: string
  preferred_name: string
  birth_date: string
  cpf: string
  email: string
  phone: string
  fiscal_street: string
  fiscal_number: string
  fiscal_district: string
  fiscal_city: string
  fiscal_state: string
  fiscal_postal_code: string
}

export type PersonFormState = { revision: number; error: string | null; values: PersonFormValues }

const EMPTY_VALUES: PersonFormValues = {
  civil_name: '', preferred_name: '', birth_date: '', cpf: '', email: '', phone: '',
  fiscal_street: '', fiscal_number: '', fiscal_district: '', fiscal_city: '', fiscal_state: '', fiscal_postal_code: '',
}
const INITIAL_STATE: PersonFormState = { revision: 0, error: null, values: EMPTY_VALUES }

export function PersonForm({ action }: { action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState> }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const values = state.values
  return <form key={state.revision} className="person-form" action={formAction}>
    {state.error && <p role="alert">{state.error}</p>}
    <label htmlFor="civil-name">Nome civil</label><input id="civil-name" name="civil_name" required defaultValue={values.civil_name} />
    <label htmlFor="preferred-name">Nome preferido</label><input id="preferred-name" name="preferred_name" defaultValue={values.preferred_name} />
    <label htmlFor="birth-date">Data de nascimento</label><input id="birth-date" name="birth_date" type="date" required defaultValue={values.birth_date} />
    <label htmlFor="cpf">CPF</label><input id="cpf" name="cpf" inputMode="numeric" autoComplete="off" defaultValue={values.cpf} />
    <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" defaultValue={values.email} />
    <label htmlFor="phone">Telefone</label><input id="phone" name="phone" inputMode="tel" defaultValue={values.phone} />
    <fieldset className="person-form__fiscal" aria-describedby="fiscal-address-help">
      <legend>Dados fiscais para NFS-e</legend>
      <p id="fiscal-address-help">Para preparar a pessoa para NFS-e, informe CPF e o endereço fiscal completo.</p>
      <label htmlFor="fiscal-street">Logradouro</label><input id="fiscal-street" name="fiscal_street" autoComplete="street-address" defaultValue={values.fiscal_street} />
      <label htmlFor="fiscal-number">Número</label><input id="fiscal-number" name="fiscal_number" defaultValue={values.fiscal_number} />
      <label htmlFor="fiscal-district">Bairro</label><input id="fiscal-district" name="fiscal_district" defaultValue={values.fiscal_district} />
      <label htmlFor="fiscal-city">Cidade</label><input id="fiscal-city" name="fiscal_city" autoComplete="address-level2" defaultValue={values.fiscal_city} />
      <label htmlFor="fiscal-state">UF</label><input id="fiscal-state" name="fiscal_state" maxLength={2} autoComplete="address-level1" defaultValue={values.fiscal_state} />
      <label htmlFor="fiscal-postal-code">CEP</label><input id="fiscal-postal-code" name="fiscal_postal_code" inputMode="numeric" autoComplete="postal-code" defaultValue={values.fiscal_postal_code} />
    </fieldset>
    <button type="submit" disabled={pending}>{pending ? 'Cadastrando…' : 'Cadastrar pessoa'}</button>
  </form>
}
