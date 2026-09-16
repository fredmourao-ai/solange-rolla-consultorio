import type { Person } from '../domain/person'

export type PeopleSearchRepository = {
  search(query: string): Promise<Pick<Person, 'id' | 'civilName' | 'preferredName' | 'emailNormalized' | 'phoneE164'>[]>
}

const numericSearchPattern = /^[+\d\s.()-]+$/

export function buildPeopleSearchFilters(query: string): string[] {
  const term = query.trim()
  if (!term) return []

  const filters = [
    `civil_name.ilike.%${term}%`,
    `preferred_name.ilike.%${term}%`,
    `email_normalized.ilike.%${term.toLowerCase()}%`,
  ]

  if (numericSearchPattern.test(term)) {
    const numeric = term.replace(/\D/g, '')
    if (numeric.length >= 3) {
      filters.push(`phone_e164.ilike.%${numeric}%`)
      filters.push(`cpf_normalized.ilike.%${numeric}%`)
    }
  }

  return filters
}

export function searchPeople(repository: PeopleSearchRepository, query: string) {
  return repository.search(query.trim())
}
