const BUSINESS_TIME_ZONE = 'America/Sao_Paulo'

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

function offsetAt(epochMs: number): number {
  const p = zonedParts(new Date(epochMs))
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - epochMs
}

export function saoPauloLocalToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('INVALID_SAO_PAULO_LOCAL_TIME')
  const [, y, mo, d, h, mi] = match
  const wallClockUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0)
  let instant = wallClockUtc - offsetAt(wallClockUtc)
  instant = wallClockUtc - offsetAt(instant)
  const result = new Date(instant)
  const p = zonedParts(result)
  if (p.year !== Number(y) || p.month !== Number(mo) || p.day !== Number(d) || p.hour !== Number(h) || p.minute !== Number(mi)) {
    throw new Error('INVALID_SAO_PAULO_LOCAL_TIME')
  }
  return result.toISOString()
}
