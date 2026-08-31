'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { MobileNav } from './mobile-nav'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children, role = 'staff' }: { children: ReactNode; role?: string }) {
  const pathname = usePathname()
  return <div className="app-shell">
    <aside className="app-shell__sidebar"><a className="app-shell__brand" href="/dashboard">Solange Rolla</a><SidebarNav pathname={pathname} role={role} /></aside>
    <div className="app-shell__content"><MobileNav pathname={pathname} role={role} /><main className="app-shell__main">{children}</main></div>
  </div>
}
