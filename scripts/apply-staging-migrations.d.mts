export type Migration = {
  version: string
  name: string
  query: string
}

export function buildMigrationQuery(migration: Migration): string

export function applyPendingMigrations(options: {
  projectRef: string
  accessToken: string
  migrations: Migration[]
  fetchImpl?: typeof fetch
}): Promise<{ applied: string[]; total: number }>

export function readLocalMigrations(directory?: string): Migration[]
