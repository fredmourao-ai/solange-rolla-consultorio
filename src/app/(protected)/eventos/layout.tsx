import Link from 'next/link'
import type { ReactNode } from 'react'
export default function EventsLayout({children}:{children:ReactNode}){return <><nav aria-label="Operações de eventos"><Link href="/eventos">Visão geral</Link>{' · '}<Link href="/eventos/operacoes">Operações</Link></nav>{children}</>}
