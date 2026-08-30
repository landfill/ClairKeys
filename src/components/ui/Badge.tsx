import { HTMLAttributes, forwardRef } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', tone = 'neutral', size = 'sm', children, ...props }, ref) => {
    const toneClasses = {
      neutral: 'bg-surface-muted text-ink',
      accent: 'bg-accent text-on-accent',
      info: 'bg-hand-left text-on-accent',
      success: 'bg-state-ready text-on-accent',
      warning: 'bg-state-progress text-on-accent',
      danger: 'bg-state-error text-on-accent',
    }

    const sizeClasses = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
    }

    return (
      <span
        ref={ref}
        className={`inline-flex max-w-full items-center justify-center gap-1 rounded-full font-medium leading-none ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

export default Badge
