import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Solange Rolla | Gestão do Consultório',
  description: 'Sistema privado de gestão do consultório e eventos.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
