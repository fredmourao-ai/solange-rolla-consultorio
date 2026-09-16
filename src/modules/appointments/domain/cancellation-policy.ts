export type CancellationPolicy = {
  policyVersion: number
  countableHours: number
  excludedWeekdays: readonly number[]
  businessTimezone: 'America/Sao_Paulo'
  lateCancellationChargeEnabled: boolean
  noShowChargeEnabled: boolean
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  policyVersion: 1,
  countableHours: 48,
  excludedWeekdays: [0, 6],
  businessTimezone: 'America/Sao_Paulo',
  lateCancellationChargeEnabled: true,
  noShowChargeEnabled: true,
}

function invalidCancellationPolicy(): never {
  throw new Error('INVALID_CANCELLATION_POLICY')
}

export function normalizeCancellationPolicySnapshot(snapshot: unknown): CancellationPolicy {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) invalidCancellationPolicy()
  const value = snapshot as Record<string, unknown>
  if (value.policyVersion !== 1) invalidCancellationPolicy()
  if (!Number.isSafeInteger(value.countableHours) || Number(value.countableHours) <= 0 || Number(value.countableHours) % 24 !== 0) invalidCancellationPolicy()
  if (!Array.isArray(value.excludedWeekdays) || value.excludedWeekdays.length === 0) invalidCancellationPolicy()
  const excludedWeekdays = value.excludedWeekdays.map((day) => {
    if (!Number.isInteger(day) || Number(day) < 0 || Number(day) > 6) invalidCancellationPolicy()
    return Number(day)
  })
  const businessTimezone = value.businessTimezone ?? DEFAULT_CANCELLATION_POLICY.businessTimezone
  const lateCancellationChargeEnabled = value.lateCancellationChargeEnabled ?? DEFAULT_CANCELLATION_POLICY.lateCancellationChargeEnabled
  const noShowChargeEnabled = value.noShowChargeEnabled ?? DEFAULT_CANCELLATION_POLICY.noShowChargeEnabled
  if (businessTimezone !== 'America/Sao_Paulo') invalidCancellationPolicy()
  if (typeof lateCancellationChargeEnabled !== 'boolean' || typeof noShowChargeEnabled !== 'boolean') invalidCancellationPolicy()

  return {
    policyVersion: 1,
    countableHours: Number(value.countableHours),
    excludedWeekdays,
    businessTimezone,
    lateCancellationChargeEnabled,
    noShowChargeEnabled,
  }
}

type LocalDateTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const localFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function localParts(date: Date): LocalDateTime {
  const parts = Object.fromEntries(
    localFormatter.formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  ) as Record<string, number>

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  }
}

function dateFromLocalParts(parts: LocalDateTime, milliseconds: number): Date {
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    milliseconds,
  )
  let guess = targetUtc

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localParts(new Date(guess))
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      milliseconds,
    )
    guess += targetUtc - actualUtc
  }

  return new Date(guess)
}

export function calculateCancellationDeadline(
  startsAt: Date,
  policy: CancellationPolicy,
): Date {
  if (
    !Number.isSafeInteger(policy.countableHours)
    || policy.countableHours <= 0
    || policy.countableHours % 24 !== 0
    || policy.businessTimezone !== 'America/Sao_Paulo'
    || policy.excludedWeekdays.length === 0
  ) {
    throw new Error('INVALID_CANCELLATION_POLICY')
  }
  if (Number.isNaN(startsAt.getTime())) throw new Error('INVALID_START_TIME')

  const local = localParts(startsAt)
  const remainingDays = policy.countableHours / 24
  const candidate = new Date(Date.UTC(local.year, local.month - 1, local.day))
  let consumedDays = 0

  while (consumedDays < remainingDays) {
    candidate.setUTCDate(candidate.getUTCDate() - 1)
    if (!policy.excludedWeekdays.includes(candidate.getUTCDay())) {
      consumedDays += 1
    }
  }

  const deadlineLocal = { ...local, year: candidate.getUTCFullYear(), month: candidate.getUTCMonth() + 1, day: candidate.getUTCDate() }
  return dateFromLocalParts(deadlineLocal, startsAt.getMilliseconds())
}
