export type StagingQueryOptions = {
  projectRef: string
  accessToken: string
  query: string
  fetchImpl?: typeof fetch
  readOnly?: boolean
}

export function queryStagingProject(options: StagingQueryOptions): Promise<unknown[]>
export function scalarFromRows(rows: unknown[]): string
