export function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('INVALID_EMAIL')
  return normalized
}

export function normalizePhoneE164BR(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (value.trim().startsWith('+55') && digits.startsWith('55')) digits = digits.slice(2)
  else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2)
  if (!/^[1-9]{2}9?\d{8}$/.test(digits)) throw new Error('INVALID_PHONE')
  return `+55${digits}`
}
