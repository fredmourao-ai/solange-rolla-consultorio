import { NextResponse } from 'next/server'
import { canonicalCapabilityDestination } from '@/platform/capabilities/redirect'
import { serverEnv } from '@/platform/env/server'
import { getCapabilityPageSession } from '@/app/(capability)/session'
import { createPublicAppointmentRuntime } from '@/app/(capability)/appointment-runtime'
import { respondToPublicConfirmation } from '@/modules/appointments/public'
import { parseBoundedFormData } from '@/platform/security/request-limits'

const validActions = ['confirm', 'request_reschedule', 'cancel'] as const

type Action = (typeof validActions)[number]

function isAction(value: string): value is Action {
  return validActions.includes(value as Action)
}

export async function POST(request: Request) {
  const appUrl = serverEnv().APP_URL
  const session = await getCapabilityPageSession({ purpose: 'appointment_response', subjectType: 'appointment' })
  if (!session) return NextResponse.redirect(canonicalCapabilityDestination('/link-expirado', appUrl), 303)

  try {
    const formData = await parseBoundedFormData(request, 'form')
    const action = String(formData.get('action') ?? '')
    if (!isAction(action)) throw new Error('INVALID_CONFIRMATION_ACTION')
    const runtime = createPublicAppointmentRuntime(session)
    await respondToPublicConfirmation({
      session,
      request,
      actionToken: String(formData.get('_action_token') ?? ''),
      action,
      acknowledgeLateCharge: formData.get('acknowledge_late_charge') === 'true',
    }, {
      repository: runtime.repository,
      allowedOrigins: [runtime.env.APP_URL],
      actionSecret: runtime.env.PUBLIC_ACTION_HMAC_KEY,
      nonceStore: runtime.nonceStore,
      rateLimiter: runtime.rateLimiter,
    })
    const ok = action === 'request_reschedule' ? 'reschedule' : action
    return NextResponse.redirect(canonicalCapabilityDestination(`/consulta?ok=${ok}`, appUrl), 303)
  } catch {
    return NextResponse.redirect(canonicalCapabilityDestination('/consulta?erro=1', appUrl), 303)
  }
}
