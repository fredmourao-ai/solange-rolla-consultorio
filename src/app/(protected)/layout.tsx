import type { ReactNode } from 'react'
import { AppShell } from '@/shared/ui/app-shell'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  // Identity/Auth supplies the server-side session and MFA guard in the next V2 task.
  return <AppShell>{children}</AppShell>
}
