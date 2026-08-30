export type ProviderEvent = {
  provider: string
  providerEventId: string
  payload: Record<string, unknown>
}

export type ProviderEventRepository = {
  insertIfNew(event: ProviderEvent): Promise<boolean>
}

export class InvalidProviderEventError extends Error {
  readonly code = 'INVALID_PROVIDER_EVENT'

  constructor() {
    super('INVALID_PROVIDER_EVENT')
    this.name = 'InvalidProviderEventError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertValidProviderEvent(input: ProviderEvent): void {
  if (
    typeof input.provider !== 'string' || input.provider.trim() === '' ||
    typeof input.providerEventId !== 'string' || input.providerEventId.trim() === '' ||
    !isRecord(input.payload)
  ) {
    throw new InvalidProviderEventError()
  }
}

export async function ingestProviderEvent(
  input: ProviderEvent,
  repository: ProviderEventRepository,
): Promise<{ duplicate: boolean }> {
  assertValidProviderEvent(input)
  return { duplicate: !(await repository.insertIfNew(input)) }
}
