import { normalizeCpf } from '../domain/cpf'
import { normalizeEmail, normalizePhoneE164BR } from '../domain/normalize'
import type { Person, PersonId } from '../domain/person'
import { matchDuplicate, type DuplicateInput } from './find-duplicates'

export type CreatePersonInput = {
  civilName: string
  preferredName?: string
  cpf?: string
  birthDate: string
  email?: string
  phone?: string
  preferredChannel?: Person['preferredChannel']
  birthdayMessagesEnabled?: boolean
}

export type PersonRepository = {
  findByUniqueFields(input: DuplicateInput): Promise<DuplicateInput | null>
  insert(input: Omit<Person, 'id'>): Promise<Person>
}

export async function createPerson(
  repository: PersonRepository,
  input: CreatePersonInput,
  options: { allowContactWarning?: boolean } = {},
): Promise<{ ok: true; person: Person } | { ok: false; code: 'DUPLICATE_CPF' | 'DUPLICATE_CONTACT' }> {
  const normalized: Omit<Person, 'id'> = {
    civilName: input.civilName.trim(),
    preferredName: input.preferredName?.trim() || null,
    cpfNormalized: input.cpf ? normalizeCpf(input.cpf) : null,
    birthDate: input.birthDate,
    emailNormalized: input.email ? normalizeEmail(input.email) : null,
    phoneE164: input.phone ? normalizePhoneE164BR(input.phone) : null,
    preferredChannel: input.preferredChannel ?? 'none',
    birthdayMessagesEnabled: input.birthdayMessagesEnabled ?? false,
  }
  const existing = await repository.findByUniqueFields(normalized)
  const duplicate = existing ? matchDuplicate(existing, normalized) : null
  if (duplicate?.kind === 'hard') return { ok: false, code: 'DUPLICATE_CPF' }
  if (duplicate?.kind === 'warning' && !options.allowContactWarning) return { ok: false, code: 'DUPLICATE_CONTACT' }
  return { ok: true, person: await repository.insert(normalized) }
}

export type { PersonId }
