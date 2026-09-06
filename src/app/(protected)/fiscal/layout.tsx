import Link from 'next/link'
import type { ReactNode } from 'react'
export default function FiscalLayout({children}:{children:ReactNode}){return <><nav aria-label="Operações fiscais"><Link href="/fiscal">Fila fiscal</Link>{' · '}<Link href="/fiscal/operacoes">Homologação mock</Link></nav>{children}</>}
