import type { ReactNode } from 'react'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header
      className="page-header"
      aria-labelledby="page-title"
      aria-describedby={description ? 'page-description' : undefined}
    >
      <div>
        <h1 id="page-title">{title}</h1>
        {description && <p id="page-description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions" aria-label="Ações da página">{actions}</div>}
    </header>
  )
}
