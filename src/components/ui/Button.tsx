import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  as?: 'button' | 'span'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled,
    as = 'button',
    children,
    ...props 
  }, ref) => {
    // 포커스 링은 `globals.css`의 전역 `:focus-visible`이 담당한다. variant마다 다른 링 색을
    // 두면 화면마다 포커스가 달라 보인다.
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
      primary: 'bg-accent text-on-accent hover:bg-accent-hover',
      secondary: 'bg-surface-muted text-ink hover:bg-rule',
      outline: 'border border-rule-strong bg-surface text-ink hover:bg-surface-muted',
      ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      danger: 'bg-state-error text-on-accent hover:brightness-90'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    const Component = as

    return (
      <Component
        ref={as === 'button' ? ref : undefined}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${as === 'span' ? 'cursor-pointer' : ''}`}
        disabled={as === 'button' ? (disabled || loading) : undefined}
        {...(as === 'button' ? props : {})}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Component>
    )
  }
)

Button.displayName = 'Button'

export default Button