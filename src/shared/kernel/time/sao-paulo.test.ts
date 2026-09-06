import { describe, expect, it } from 'vitest'
import { saoPauloLocalToIso } from './sao-paulo'

describe('saoPauloLocalToIso', () => {
  it('converts a local Sao Paulo wall-clock value to UTC', () => {
    expect(saoPauloLocalToIso('2035-03-10T09:00')).toBe('2035-03-10T12:00:00.000Z')
  })

  it('rejects malformed local values', () => {
    expect(() => saoPauloLocalToIso('2035/03/10 09:00')).toThrow('INVALID_SAO_PAULO_LOCAL_TIME')
  })
})
