export type EncryptionContext = {
  entity: string
  id: string
}

export type EncryptedEnvelope = {
  alg: 'A256GCM'
  keyVersion: number
  iv: string
  ciphertext: string
  authTag: string
}

export interface SensitiveDataCrypto {
  encrypt(plaintext: string, context: EncryptionContext): Promise<EncryptedEnvelope>
  decrypt(envelope: EncryptedEnvelope, context: EncryptionContext): Promise<string>
}
