import type { Person, PersonId } from '../domain/person'

export type UpdatePersonRepository = {
  update(id: PersonId, input: Partial<Person>): Promise<Person>
}

export function updatePerson(repository: UpdatePersonRepository, id: PersonId, input: Partial<Person>) {
  return repository.update(id, input)
}
