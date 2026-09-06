import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AgendaLayout({ children }: { children: ReactNode }) {
  return <>
    <nav aria-label="Operações da agenda">
      <Link href="/agenda">Calendário</Link>{' · '}
      <Link href="/agenda/gerenciar">Gerenciar consultas</Link>
    </nav>
    {children}
  </>
}
