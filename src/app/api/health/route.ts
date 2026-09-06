import { createCorrelationId } from '../../../platform/observability/logger'

export const dynamic = 'force-dynamic'

export function GET() {
  const payload = {
    status: 'ok',
    appVersion: process.env.npm_package_version ?? '0.1.0',
    buildSha: process.env.APP_BUILD_SHA ?? 'unknown',
    environment: process.env.APP_ENV ?? 'unknown',
    checks: {
      configuration: Boolean(process.env.APP_ENV),
      correlation: true,
    },
    correlationId: createCorrelationId(),
  }
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
