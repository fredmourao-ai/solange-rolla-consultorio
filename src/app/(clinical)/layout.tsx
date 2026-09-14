import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getStaffSession } from '@/modules/identity/public'
import { AppShell } from '@/shared/ui/app-shell'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Deliberately does not redirect an unauthenticated visitor: clinico's own
 * page component already returns notFound() for that case (and for any
 * role/AAL2 failure short of a real MFA challenge), so this route never
 * confirms a clinical record's existence with a login redirect the way the
 * rest of the app's protected pages correctly do. See
 * tests/e2e/clinical-isolation.spec.ts and security-boundaries.spec.ts.
 */
export default async function ClinicalLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession()
  return <AppShell permissions={session?.permissions ?? []}>{children}</AppShell>
}
