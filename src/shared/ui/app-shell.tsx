'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { MobileNav } from './mobile-nav'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children, role = 'staff' }: { children: ReactNode; role?: string }) {
  const pathname = usePathname()
  return <div className="app-shell">
    <aside className="app-shell__sidebar">
      <a className="app-shell__brand" href="/dashboard" aria-label="Solange Rolla - Dashboard"><Image className="brand-logo" src="/brand/solange-rolla-logo.png" alt="" width={245} height={60} /></a>
      <p className="app-shell__context">Gestão do consultório</p>
      <SidebarNav pathname={pathname} role={role} />
      <p className="app-shell__privacy">Ambiente privado e rastreável</p>
    </aside>
    <div className="app-shell__content"><MobileNav pathname={pathname} role={role} /><main className="app-shell__main">{children}</main></div>
  </div>
}
