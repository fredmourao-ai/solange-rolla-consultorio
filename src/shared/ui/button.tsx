import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function Button({ variant = 'primary', className = '', disabled, type = 'button', ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={disabled}
        aria-disabled={disabled ? 'true' : 'false'}
        className={`ui-button ui-button--${variant} ${className}`.trim()}
      />
    )
  },
)
