import Link from 'next/link'

type NavItem = { href: string; label: string; clinical?: boolean }
const items: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/people', label: 'Pessoas' },
  { href: '/appointments', label: 'Agenda' },
  { href: '/events', label: 'Eventos' },
  { href: '/receivables', label: 'Financeiro' },
  { href: '/fiscal', label: 'Fiscal' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/clinical', label: 'Clínico', clinical: true },
]

export function SidebarNav({ pathname = '/dashboard', role = 'staff' }: { pathname?: string; role?: string }) {
  return <nav className="sidebar-nav" aria-label="Navegação principal">
    {items.filter((item) => !item.clinical || role === 'psychologist_owner').map((item) => (
      <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
    ))}
  </nav>
}
