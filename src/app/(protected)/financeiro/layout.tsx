import Link from 'next/link'
import type { ReactNode } from 'react'

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <>
    <nav aria-label="Operações financeiras"><Link href="/financeiro">Visão geral</Link>{' · '}<Link href="/financeiro/operacoes">Operações</Link></nav>
    {children}
  </>
}
