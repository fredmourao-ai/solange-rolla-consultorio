export type SyntheticPerson = {
  id: string
  preferredName: string
  email: string
  phone: string
}

export function syntheticPerson(id = 'synthetic-person-1'): SyntheticPerson {
  return { id, preferredName: 'Pessoa Sintética', email: `${id}@example.test`, phone: '+5511000000000' }
}
