import type { Person } from '../domain/person'

export type PeopleSearchRepository = {
  search(query: string): Promise<Pick<Person, 'id' | 'civilName' | 'preferredName' | 'emailNormalized' | 'phoneE164'>[]>
}

export function searchPeople(repository: PeopleSearchRepository, query: string) {
  return repository.search(query.trim())
}
