import { forwardRef, type InputHTMLAttributes } from 'react'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className = '', type = 'checkbox', ...props }, ref) {
    return <input {...props} ref={ref} type={type} className={`ui-checkbox ${className}`.trim()} />
  },
)
