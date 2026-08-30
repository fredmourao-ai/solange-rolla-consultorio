export type ProviderEvent = {
  provider: string
  providerEventId: string
  payload: Record<string, unknown>
  delivery?: ProviderDeliveryUpdate
}

export type DeliveryStatus = 'sent' | 'delivered' | 'read'

export type ProviderDeliveryUpdate = {
  messageId: string
  status: DeliveryStatus
}

export type ProviderEventRepository = {
  insertIfNew(event: ProviderEvent): Promise<boolean>
  applyDeliveryStatus?: (update: ProviderDeliveryUpdate) => Promise<'updated' | 'ignored' | 'unknown'>
}

export type ProviderEventProcessor = (event: ProviderEvent) => Promise<void>

const DELIVERY_STATUS_ORDER: Record<DeliveryStatus, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
}

export function shouldAdvanceDeliveryStatus(current: DeliveryStatus, incoming: DeliveryStatus): boolean {
  return DELIVERY_STATUS_ORDER[incoming] > DELIVERY_STATUS_ORDER[current]
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

function assertValidEvent(input: ProviderEvent): void {
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
  processNewEvent?: ProviderEventProcessor,
): Promise<{ duplicate: boolean }> {
  assertValidEvent(input)
  const inserted = await repository.insertIfNew(input)
  if (!inserted) return { duplicate: true }
  if (input.delivery) await repository.applyDeliveryStatus?.(input.delivery)
  await processNewEvent?.(input)
  return { duplicate: false }
}
