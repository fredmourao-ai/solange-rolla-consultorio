export function normalizeLoginCredentials(identifierValue: string, passwordValue: string) {
  return { email: identifierValue.trim(), password: passwordValue }
}