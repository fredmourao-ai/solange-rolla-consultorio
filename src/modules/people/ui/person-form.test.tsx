import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EMPTY_PERSON_FORM_VALUES, PersonForm, type PersonFormState } from './person-form'

const action = async (state: PersonFormState) => state

describe('PersonForm', () => {
  it('offers the complete existing administrative and fiscal fields for a patient', () => {
    const markup = renderToStaticMarkup(<PersonForm action={action} />)

    expect(markup).toContain('Cadastrar paciente')
    expect(markup).toContain('name="civil_name"')
    expect(markup).toContain('name="preferred_name"')
    expect(markup).toContain('name="birth_date"')
    expect(markup).toContain('name="cpf"')
    expect(markup).toContain('name="email"')
    expect(markup).toContain('name="phone"')
    expect(markup).toContain('name="preferred_channel"')
    expect(markup).toContain('name="birthday_messages_enabled"')
    expect(markup).toContain('Contato de emergência')
    expect(markup).toContain('name="emergency_contact_name"')
    expect(markup).toContain('name="emergency_contact_phone"')
    expect(markup).toContain('name="emergency_contact_relationship"')
    expect(markup).toContain('name="fiscal_complement"')
    expect(markup).toContain('Dados fiscais para NFS-e')
  })

  it('loads existing patient values and presents an edit action', () => {
    const markup = renderToStaticMarkup(<PersonForm
      action={action}
      mode="edit"
      initialValues={{
        ...EMPTY_PERSON_FORM_VALUES,
        civil_name: 'Ana Souza',
        preferred_name: 'Ana',
        email: 'ana@example.test',
        preferred_channel: 'whatsapp',
        birthday_messages_enabled: true,
        emergency_contact_name: 'Maria Souza',
        emergency_contact_phone: '+5531987654321',
        emergency_contact_relationship: 'Irmã',
        fiscal_complement: 'Sala 2',
      }}
    />)

    expect(markup).toContain('value="Ana Souza"')
    expect(markup).toContain('value="ana@example.test"')
    expect(markup).toContain('value="Maria Souza"')
    expect(markup).toContain('value="+5531987654321"')
    expect(markup).toContain('value="Irmã"')
    expect(markup).toContain('value="Sala 2"')
    expect(markup).toContain('<option value="whatsapp" selected="">WhatsApp</option>')
    expect(markup).toContain('checked=""')
    expect(markup).toContain('Salvar cadastro')
  })
})
