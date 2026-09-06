import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './route'

const previousBuildSha = process.env.APP_BUILD_SHA
const previousAppEnv = process.env.APP_ENV

afterEach(() => {
  if (previousBuildSha === undefined) delete process.env.APP_BUILD_SHA
  else process.env.APP_BUILD_SHA = previousBuildSha
  if (previousAppEnv === undefined) delete process.env.APP_ENV
  else process.env.APP_ENV = previousAppEnv
})

describe('GET /api/health', () => {
  it('reports the exact deployed build SHA', async () => {
    const buildSha = 'a'.repeat(40)
    process.env.APP_BUILD_SHA = buildSha
    process.env.APP_ENV = 'staging'

    const response = GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: 'ok',
      environment: 'staging',
      buildSha,
    })
  })
})
