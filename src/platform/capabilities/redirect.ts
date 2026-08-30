export function canonicalCapabilityDestination(pathname: string, appUrl: string): URL {
  if (!pathname.startsWith('/')) throw new Error('CAPABILITY_DESTINATION_INVALID')
  return new URL(pathname, appUrl)
}
