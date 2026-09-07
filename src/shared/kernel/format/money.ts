export function formatBRLFromCents(cents: number | bigint): string {
  if (typeof cents === 'number' && !Number.isSafeInteger(cents)) {
    throw new RangeError('Money cents must be a safe integer')
  }
  const value = typeof cents === 'bigint' ? cents : BigInt(cents)
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  const reais = absolute / 100n
  const decimals = (absolute % 100n).toString().padStart(2, '0')
  const formattedReais = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}R$\u00a0${formattedReais},${decimals}`
}

export function parsePositiveMoneyToCents(input: string): number {
  const normalized = input.trim().replace(',', '.')
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) throw new RangeError('Money value must be a positive decimal with at most two places')
  const whole = BigInt(match[1])
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0') || '0')
  const cents = whole * 100n + fraction
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Money cents must be a positive safe integer')
  return Number(cents)
}
