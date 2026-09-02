'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { SidebarNav } from './sidebar-nav'

export function MobileNav({ pathname, role }: { pathname?: string; role?: string }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])
  useEffect(() => { if (!open && wasOpenRef.current) triggerRef.current?.focus(); wasOpenRef.current = open }, [open])
  return <div className="mobile-nav">
    <Link className="mobile-nav__brand" href="/dashboard" aria-label="Solange Rolla - Dashboard"><Image src="/brand/solange-rolla-logo.png" alt="" width={196} height={48} /></Link>
  </div>
}
