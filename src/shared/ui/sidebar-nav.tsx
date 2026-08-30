import Link from 'next/link'

type NavItem = { href: string; label: string }
const items: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pessoas', label: 'Pessoas' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/financeiro', label: 'Financeiro' },
  { href: '/fiscal', label: 'Fiscal' },
  { href: '/relatorios', label: 'Relatórios' },
]

export function SidebarNav({ pathname = '/dashboard' }: { pathname?: string; role?: string }) {
  return <nav className="sidebar-nav" aria-label="Navegação principal">
    {items.map((item) => (
      <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
    ))}
  </nav>
}
