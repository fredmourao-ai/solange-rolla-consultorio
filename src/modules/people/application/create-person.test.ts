import { describe, expect, it } from 'vitest'

import { createPerson, type PersonRepository } from './create-person'
import type { Person, PersonId } from '../domain/person'

function repository(): PersonRepository {
  return {
    async findByUniqueFields() {
      return null
    },
    async insert(input) {
      return { id: 'person-1' as PersonId, ...input }
    },
  }
}

describe('createPerson', () => {
  it('normalizes and persists emergency contact details with the patient', async () => {
    const result = await createPerson(repository(), {
      civilName: 'Ana Souza',
      birthDate: '1990-01-01',
      emergencyContact: {
        name: ' Maria Souza ',
        phone: '(31) 98765-4321',
        relationship: ' Irmã ',
      },
    })

    expect(result).toEqual({
      ok: true,
      person: {
        id: 'person-1' as PersonId,
        civilName: 'Ana Souza',
        preferredName: null,
        cpfNormalized: null,
        birthDate: '1990-01-01',
        emailNormalized: null,
        phoneE164: null,
        preferredChannel: 'none',
        birthdayMessagesEnabled: false,
        emergencyContact: {
          name: 'Maria Souza',
          phoneE164: '+5531987654321',
          relationship: 'Irmã',
        },
      } satisfies Person,
    })
  })

  it('rejects incomplete emergency contact details', async () => {
    await expect(createPerson(repository(), {
      civilName: 'Ana Souza',
      birthDate: '1990-01-01',
      emergencyContact: {
        name: 'Maria Souza',
        phone: '',
        relationship: '',
      },
    })).rejects.toThrow('INVALID_EMERGENCY_CONTACT')
  })

  it('reports emergency contact errors separately from the main phone', async () => {
    await expect(createPerson(repository(), {
      civilName: 'Ana Souza',
      birthDate: '1990-01-01',
      emergencyContact: {
        name: 'Maria Souza',
        phone: '31',
      },
    })).rejects.toThrow('INVALID_EMERGENCY_CONTACT')
  })
})
