import { describe, expect, it } from 'vitest'
import { ingestProviderEvent } from './ingest-provider-event'

it('deduplicates provider events before processing', async () => {
  let inserts = 0
  const repository = { insertIfNew: async () => { inserts += 1; return inserts === 1 } }
  expect(await ingestProviderEvent({ provider: 'mock', providerEventId: 'evt-1', payload: {} }, repository)).toEqual({ duplicate: false })
  expect(await ingestProviderEvent({ provider: 'mock', providerEventId: 'evt-1', payload: {} }, repository)).toEqual({ duplicate: true })
})
