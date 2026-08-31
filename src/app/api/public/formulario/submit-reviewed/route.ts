import { NextResponse } from 'next/server'
import { canonicalCapabilityDestination } from '@/platform/capabilities/redirect'
import { serverEnv } from '@/platform/env/server'
import { getCapabilityPageSession } from '@/app/(capability)/session'
import { createPublicIntakeRuntime } from '@/app/(capability)/intake-runtime'
import { submitReviewedPublicIntake } from '@/modules/forms/public'

export async function POST(request: Request) {
  const appUrl = serverEnv().APP_URL
  const session = await getCapabilityPageSession({ purpose: 'form_fill', subjectType: 'form_submission' })
  if (!session) return NextResponse.redirect(canonicalCapabilityDestination('/link-expirado', appUrl), 303)
  try {
    const formData = await request.formData()
    const runtime = createPublicIntakeRuntime(session)
    await submitReviewedPublicIntake({
      session,
      request,
      actionToken: String(formData.get('_submit_token') ?? ''),
    }, {
      repository: runtime.formRepository,
      crypto: runtime.crypto,
      allowedOrigins: [runtime.env.APP_URL],
      actionSecret: runtime.env.PUBLIC_ACTION_HMAC_KEY,
      nonceStore: runtime.nonceStore,
      rateLimiter: runtime.rateLimiter,
    })
    return NextResponse.redirect(canonicalCapabilityDestination('/formulario/assinar', appUrl), 303)
  } catch {
    return NextResponse.redirect(canonicalCapabilityDestination('/formulario/revisao?erro=1', appUrl), 303)
  }
}
