import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`ui-card ${className}`.trim()}>{children}</section>
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="ui-card__title">{children}</h2>
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="ui-card__description">{children}</p>
}
