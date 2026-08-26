import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>Solange Rolla</h1>
      <p>Sistema privado de gestão do consultório e eventos.</p>
      <Link href="/dashboard">Abrir painel</Link>
    </main>
  )
}
