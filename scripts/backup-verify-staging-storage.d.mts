export const REQUIRED_PRIVATE_BUCKETS: readonly string[]

export type StagingStorageRecoveryResult = {
  bucketCount: number
  objectCount: number
  totalBytes: number
  probeCount: number
}

export function backupAndVerifyStagingStorage(options: {
  url: string
  secretKey: string
  destination: string
  createClientImpl?: (url: string, secretKey: string, options: unknown) => unknown
}): Promise<StagingStorageRecoveryResult>
