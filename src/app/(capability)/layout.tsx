import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCapabilityPageSession } from './session'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function CapabilityLayout({ children }: { children: ReactNode }) {
  const session = await getCapabilityPageSession()
  if (!session) redirect('/link-expirado')
  return <main className="capability-page">{children}</main>
}
