'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { SidebarNav } from './sidebar-nav'

export function MobileNav({ pathname, role }: { pathname?: string; role?: string }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])
  useEffect(() => {
    if (!open && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = open
  }, [open])
  return <div className="mobile-nav">
    <strong>Solange Rolla</strong>
    <Button ref={triggerRef} variant="outline" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>{open ? 'Fechar menu' : 'Abrir menu'}</Button>
    {open && <div id="mobile-navigation" className="mobile-nav__panel" onClick={() => setOpen(false)}><Link href="/dashboard">Início</Link><SidebarNav pathname={pathname} role={role} /></div>}
  </div>
}
