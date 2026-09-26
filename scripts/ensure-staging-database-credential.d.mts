export type StagingDatabaseCredentialResult = {
  path: string
  source: 'existing' | 'rotated'
}

export type StagingDatabaseCredentialOptions = {
  root?: string
  token?: string
  projectRef?: string
  forceRotate?: boolean
  fetchImpl?: typeof fetch
}

export function ensureStagingDatabaseCredential(
  options?: StagingDatabaseCredentialOptions,
): Promise<StagingDatabaseCredentialResult>
