'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { AppPermission } from '@/modules/identity/public'
import { MobileNav } from './mobile-nav'
import { SessionControls } from './session-controls'
import { SidebarNav } from './sidebar-nav'
import styles from './app-shell.module.css'

export function AppShell({
  children,
  permissions = [],
}: {
  children: ReactNode
  permissions?: readonly AppPermission[]
}) {
  const pathname = usePathname()
  return <div className="app-shell">
    <aside className={`app-shell__sidebar ${styles.sidebar}`}>
      <a className="app-shell__brand" href="/dashboard" aria-label="Solange Rolla - Início">
        <Image className="brand-logo" src="/brand/solange-rolla-logo.png" alt="" width={245} height={60} />
        <span className="app-shell__brand-name">Solange Rolla</span>
      </a>
      <p className="app-shell__brand-context app-shell__context">Gestão do consultório</p>
      <div className={`${styles.sidebarScroll} app-shell__sidebar-scroll`} data-testid="sidebar-scroll-region">
        <SidebarNav pathname={pathname} permissions={permissions} />
        <SessionControls />
        <p className="app-shell__privacy">Ambiente privado e rastreável</p>
      </div>
    </aside>
    <div className="app-shell__content">
      <MobileNav pathname={pathname} permissions={permissions} />
      <main className="app-shell__main">{children}</main>
    </div>
  </div>
}
