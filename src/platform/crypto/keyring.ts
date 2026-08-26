import { createHash } from 'node:crypto'

export type EncryptionEnvironment = Record<string, string | undefined>

export type Keyring = {
  activeVersion: number
  getKey(version: number): Buffer
}

function parseVersion(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error('CLINICAL_ENCRYPTION_ACTIVE_VERSION must be a positive integer')
  }

  const version = Number(value)
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('CLINICAL_ENCRYPTION_ACTIVE_VERSION must be a positive integer')
  }

  return version
}

function parseKey(value: string | undefined, variableName: string): Buffer {
  if (!value || value === 'replace-me-encryption-key') {
    throw new Error(`${variableName} is required`)
  }

  const key = Buffer.from(value, 'base64')
  if (key.length !== 32) {
    throw new Error(`${variableName} must be base64 encoded and exactly 32 bytes`)
  }

  return key
}

export function createKeyring(env: EncryptionEnvironment = process.env): Keyring {
  const activeVersion = parseVersion(env.CLINICAL_ENCRYPTION_ACTIVE_VERSION)
  const keys = new Map<number, Buffer>()

  const getKey = (version: number) => {
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error('Encryption key version must be a positive integer')
    }

    const existing = keys.get(version)
    if (existing) return existing

    const key = parseKey(env[`CLINICAL_ENCRYPTION_KEY_V${version}`], `CLINICAL_ENCRYPTION_KEY_V${version}`)
    keys.set(version, key)
    return key
  }

  getKey(activeVersion)

  return { activeVersion, getKey }
}

export function keyFingerprint(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 12)
}
