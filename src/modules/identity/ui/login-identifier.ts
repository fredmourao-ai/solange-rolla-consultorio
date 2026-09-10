const TEMP_ADMIN_USERNAME = 'admin'
const TEMP_ADMIN_PASSWORD = 'admin'
const DEMO_ADMIN_EMAIL = 'demo.owner@solange.invalid'
const DEMO_ADMIN_PASSWORD = 'DemoLocalOnly!2026'

export function normalizeLoginCredentials(identifierValue: string, passwordValue: string, enabled: boolean) {
  const identifier = identifierValue.trim()
  if (enabled && identifier.toLowerCase() === TEMP_ADMIN_USERNAME && passwordValue === TEMP_ADMIN_PASSWORD) {
    return { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD }
  }

  return { email: identifier, password: passwordValue }
}
