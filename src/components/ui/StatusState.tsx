import type { ReactNode } from 'react'
import { AlertIcon } from './icons'

interface StatusStateProps {
  title: string
  detail: string
  action?: ReactNode
  tone?: 'neutral' | 'error'
  className?: string
}

/** 모든 빈 상태와 오류 상태가 원인과 다음 행동을 함께 말하도록 하는 공통 표현입니다. */
export default function StatusState({
  title,
  detail,
  action,
  tone = 'neutral',
  className = '',
}: StatusStateProps) {
  const titleClass = tone === 'error' ? 'text-state-error' : 'text-ink'

  return (
    <section role={tone === 'error' ? 'alert' : undefined} className={`rounded-lg border border-rule bg-surface p-8 text-center ${className}`}>
      {tone === 'error' && <AlertIcon size={20} className="mx-auto mb-3 text-state-error" />}
      <h2 className={`text-lg font-semibold ${titleClass}`}>{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{detail}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  )
}
