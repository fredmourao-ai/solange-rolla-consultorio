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
