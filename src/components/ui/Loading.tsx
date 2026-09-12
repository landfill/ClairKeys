interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function Loading({ 
  size = 'md', 
  text,
  className = '' 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  /*
    화면을 보지 않는 사람에게 이름 없는 회전 아이콘은 "아무 일도 없는 화면"과 같다. `role="status"`
    가 이 영역을 상태로 알린다. `status`는 내용으로 이름이 계산되는 역할이 아니므로 이름은
    `aria-label`이 주고, 라이브 영역이 읽어 줄 내용은 문구 또는 화면에만 숨긴 기본 문구가 맡는다.
    회전 아이콘 자체는 읽을 내용이 아니므로 접근성 트리에서 숨긴다 (이슈 #146 stage 4).
  */
  const label = text ?? '불러오는 중'

  return (
    <div role="status" aria-label={label} className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        aria-hidden="true"
        className={`animate-spin ${sizeClasses[size]} text-accent`}
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
      {text ? (
        <p className="mt-2 text-sm text-ink-muted">{text}</p>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  )
}