const sensitiveKeyPattern = /(cpf|token|secret|authorization|password|answer|clinical|note|diagnos|signature|xml|payload)/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?\d[\d\s().-]{8,}$/

export function redact(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>())
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return emailPattern.test(value) || phonePattern.test(value) ? '[REDACTED]' : value
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, seen))
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sensitiveKeyPattern.test(key) ? '[REDACTED]' : redactValue(entry, seen)]))
}
