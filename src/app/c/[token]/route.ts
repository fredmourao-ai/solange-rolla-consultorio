import { NextResponse, type NextRequest } from 'next/server'
import { capabilityCookieOptions, CAPABILITY_COOKIE_NAME } from '@/platform/capabilities/cookie'
import { exchangeCapability } from '@/platform/capabilities/exchange'
import { createCapabilityExchangeRepository } from '@/platform/capabilities/repository'
import { canonicalCapabilityDestination } from '@/platform/capabilities/redirect'
import { serverEnv } from '@/platform/env/server'
import { publicErrorResponse } from '@/platform/security/request-limits'

const destinations: Record<string, string> = {
  form_fill: '/formulario',
  appointment_confirm: '/consulta',
  appointment_cancel: '/consulta',
  appointment_reschedule: '/consulta',
  appointment_response: '/consulta',
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const purpose = request.nextUrl.searchParams.get('purpose') ?? 'form_fill'
  if (!destinations[purpose]) return publicErrorResponse('CAPABILITY_INVALID')

  const capability = await exchangeCapability(token, purpose, createCapabilityExchangeRepository())
  if (!capability) return publicErrorResponse('CAPABILITY_INVALID')

  const destination = canonicalCapabilityDestination(destinations[purpose], serverEnv().APP_URL)
  const response = NextResponse.redirect(destination, 303)
  const maxAge = Math.max(1, Math.floor((new Date(capability.expiresAt).getTime() - Date.now()) / 1000))
  response.cookies.set(CAPABILITY_COOKIE_NAME, capability.id, capabilityCookieOptions(maxAge, { secure: request.nextUrl.protocol === 'https:' }))
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
