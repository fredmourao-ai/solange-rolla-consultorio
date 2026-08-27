import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CAPABILITY_COOKIE_NAME } from '@/platform/capabilities/cookie'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function CapabilityLayout({ children }: { children: ReactNode }) {
  const session = (await cookies()).get(CAPABILITY_COOKIE_NAME)
  if (!session?.value) redirect('/link-expirado')
  return <main className="capability-page">{children}</main>
}
