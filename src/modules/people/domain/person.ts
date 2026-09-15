export type PersonId = string & { readonly __brand: 'PersonId' }

export type PreferredChannel = 'whatsapp' | 'email' | 'phone' | 'none'

export type EmergencyContact = {
  name: string
  phoneE164: string
  relationship: string | null
}

export type Person = {
  id: PersonId
  civilName: string
  preferredName: string | null
  cpfNormalized: string | null
  birthDate: string
  emailNormalized: string | null
  phoneE164: string | null
  preferredChannel: PreferredChannel
  birthdayMessagesEnabled: boolean
  emergencyContact: EmergencyContact | null
}
