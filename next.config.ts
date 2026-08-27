import type { NextConfig } from 'next'

import { buildSecurityHeaders } from './src/platform/security/headers'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const environment = process.env.APP_ENV ?? 'production'
    const validEnvironment = ['local', 'test', 'preview', 'staging', 'production'].includes(environment)
      ? (environment as Parameters<typeof buildSecurityHeaders>[0]['environment'])
      : 'production'
    const securityHeaders = buildSecurityHeaders({ environment: validEnvironment })
    return [{ source: '/(.*)', headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })) }]
  },
}

export default nextConfig
