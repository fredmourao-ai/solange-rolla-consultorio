import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getStaffSession } from '@/modules/identity/public'
import { AppShell } from '@/shared/ui/app-shell'

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession()
  if (!session && process.env.APP_ENV === 'production') redirect('/login')

  return <AppShell role={session?.role ?? 'staff'}>{children}</AppShell>
}
