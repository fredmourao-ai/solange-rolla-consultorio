const TEMP_ADMIN_USERNAME = 'admin'
const TEMP_ADMIN_EMAIL = 'admin@solange.invalid'

export function normalizeLoginIdentifier(value: string) {
  const identifier = value.trim()
  return identifier.toLowerCase() === TEMP_ADMIN_USERNAME ? TEMP_ADMIN_EMAIL : identifier
}
