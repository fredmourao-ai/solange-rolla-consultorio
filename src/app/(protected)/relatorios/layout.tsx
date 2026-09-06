import Link from 'next/link'
import type { ReactNode } from 'react'
export default function ReportsLayout({children}:{children:ReactNode}){return <><nav aria-label="Relatórios"><Link href="/relatorios">Indicadores</Link>{' · '}<Link href="/relatorios/baixar">Exportar CSV/XLSX/PDF</Link></nav>{children}</>}
