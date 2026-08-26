import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

export function FormField({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string
  label: string
  description?: string
  error?: string
  children: ReactNode
}) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(' ')
  const childElement = isValidElement(children) ? children as ReactElement<Record<string, unknown>> : null
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>{label}</label>
      {description && <span className="form-field__description" id={`${id}-description`}>{description}</span>}
      {childElement
        ? cloneElement(childElement, {
            'aria-describedby': [childElement.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
            'aria-errormessage': error ? `${id}-error` : undefined,
            'aria-invalid': error ? 'true' : undefined,
          })
        : children}
      {error && <span className="form-field__error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  )
}
