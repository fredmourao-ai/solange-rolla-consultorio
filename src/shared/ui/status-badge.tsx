type Status = 'success' | 'danger' | 'warning' | 'neutral'

export function StatusBadge({ status, children }: { status: Status; children: string }) {
  return <span className={`status-badge status-badge--${status}`} aria-label={`Status: ${children}`}>{children}</span>
}
