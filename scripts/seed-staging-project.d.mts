export function seedStagingProject(options: {
  stagingRef: string
  productionRef: string
  accessToken: string
  seedSql: string
  fetchImpl?: typeof fetch
}): Promise<void>
