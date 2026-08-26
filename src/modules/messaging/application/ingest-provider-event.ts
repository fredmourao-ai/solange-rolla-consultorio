export type ProviderEventRepository = { insertIfNew(event: { provider: string; providerEventId: string; payload: Record<string, unknown> }): Promise<boolean> }

export async function ingestProviderEvent(input: { provider: string; providerEventId: string; payload: Record<string, unknown> }, repository: ProviderEventRepository): Promise<{ duplicate: boolean }> {
  return { duplicate: !(await repository.insertIfNew(input)) }
}
