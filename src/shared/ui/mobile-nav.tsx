'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { AppPermission } from '@/modules/identity/public'
import { Button } from './button'
import { SessionControls } from './session-controls'
import { SidebarNav } from './sidebar-nav'

export function MobileNav({
  pathname,
  permissions = [],
}: {
  pathname?: string | null
  permissions?: readonly AppPermission[]
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = open
  }, [open])

  return <div className="mobile-nav">
    <Link className="mobile-nav__brand" href="/dashboard" aria-label="Solange Rolla - Início">
      <Image src="/brand/solange-rolla-logo.png" alt="" width={196} height={48} priority />
    </Link>
    <Button
      ref={triggerRef}
      variant="outline"
      aria-expanded={open}
      aria-controls="mobile-navigation"
      onClick={() => setOpen((value) => !value)}
    >
      {open ? 'Fechar menu' : 'Abrir menu'}
    </Button>
    {open && <div id="mobile-navigation" className="mobile-nav__panel">
      <SidebarNav pathname={pathname} permissions={permissions} onNavigate={() => setOpen(false)} />
      <SessionControls onNavigate={() => setOpen(false)} />
    </div>}
  </div>
}
