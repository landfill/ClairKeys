'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { currentReturnPath } from '@/lib/returnPath'
import { LockIcon } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  fallback,
  redirectTo = '/auth/signin'
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      // `LoginButton`과 같은 규칙을 쓴다 (`src/lib/returnPath.ts`).
      const returnTo = currentReturnPath()
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(returnTo)}`)
    }
  }, [session, status, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" />
          <p className="mt-4 text-ink-muted">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <LockIcon size={40} className="mx-auto text-ink-muted" />
          <h2 className="mt-4 text-xl font-semibold text-ink">
            로그인이 필요합니다
          </h2>
          <p className="mt-2 text-ink-muted">
            이 페이지에 접근하려면 로그인해주세요.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}