import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { EncryptionContext, SensitiveDataCrypto } from './types'
import { createKeyring, type EncryptionEnvironment } from './keyring'

const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

function associatedData(context: EncryptionContext): Buffer {
  if (!context.entity || !context.id || context.entity.includes(':') || context.id.includes(':')) {
    throw new Error('Encryption context must contain non-empty entity and id without colons')
  }

  return Buffer.from(`${context.entity}:${context.id}`, 'utf8')
}

export function createSensitiveDataCrypto(env: EncryptionEnvironment = process.env): SensitiveDataCrypto {
  const keyring = createKeyring(env)

  return {
    async encrypt(plaintext, context) {
      const iv = randomBytes(IV_BYTES)
      const cipher = createCipheriv('aes-256-gcm', keyring.getKey(keyring.activeVersion), iv)
      cipher.setAAD(associatedData(context))
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

      return {
        alg: 'A256GCM',
        keyVersion: keyring.activeVersion,
        iv: iv.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
      }
    },

    async decrypt(envelope, context) {
      if (envelope.alg !== 'A256GCM') throw new Error('Unsupported encryption algorithm')

      const iv = Buffer.from(envelope.iv, 'base64')
      const authTag = Buffer.from(envelope.authTag, 'base64')
      if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
        throw new Error('Invalid encrypted envelope')
      }

      const decipher = createDecipheriv('aes-256-gcm', keyring.getKey(envelope.keyVersion), iv)
      decipher.setAAD(associatedData(context))
      decipher.setAuthTag(authTag)
      return Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8')
    },
  }
}
