export type DuplicateInput = {
  cpfNormalized: string | null
  emailNormalized: string | null
  phoneE164: string | null
}

export type DuplicateMatch =
  | { kind: 'hard'; reason: 'cpf' }
  | { kind: 'warning'; reason: 'email' | 'phone' }
  | null

export function matchDuplicate(existing: DuplicateInput, incoming: DuplicateInput): DuplicateMatch {
  if (existing.cpfNormalized && incoming.cpfNormalized && existing.cpfNormalized === incoming.cpfNormalized) {
    return { kind: 'hard', reason: 'cpf' }
  }
  if (existing.emailNormalized && incoming.emailNormalized && existing.emailNormalized === incoming.emailNormalized) {
    return { kind: 'warning', reason: 'email' }
  }
  if (existing.phoneE164 && incoming.phoneE164 && existing.phoneE164 === incoming.phoneE164) {
    return { kind: 'warning', reason: 'phone' }
  }
  return null
}

export function findPotentialDuplicates(existing: readonly DuplicateInput[], incoming: DuplicateInput): DuplicateMatch[] {
  return existing.map((candidate) => matchDuplicate(candidate, incoming)).filter((match): match is DuplicateMatch => match !== null)
}
