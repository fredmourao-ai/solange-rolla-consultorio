import { describe, expect, it } from 'vitest'
import { buildPeopleSearchFilters } from './search-people'

describe('people search filters', () => {
  it('does not treat incidental digits in an alphanumeric name as phone or CPF search', () => {
    expect(buildPeopleSearchFilters('Paciente Preferências a1aebf2c')).toEqual([
      'civil_name.ilike.%Paciente Preferências a1aebf2c%',
      'preferred_name.ilike.%Paciente Preferências a1aebf2c%',
      'email_normalized.ilike.%paciente preferências a1aebf2c%',
    ])
  })

  it('adds phone and CPF filters for an intentionally numeric search', () => {
    expect(buildPeopleSearchFilters('31 99999-1234')).toContain('phone_e164.ilike.%31999991234%')
    expect(buildPeopleSearchFilters('123.456.789-00')).toContain('cpf_normalized.ilike.%12345678900%')
  })
})
