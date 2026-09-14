import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { AppShell } from '@/shared/ui/app-shell'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  authorizeStaffSession(session, ['psychologist_owner', 'secretary', 'accounting'])

  return <AppShell permissions={session.permissions}>{children}</AppShell>
}
