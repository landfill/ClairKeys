'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
      const currentUrl = window.location.pathname + window.location.search
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(currentUrl)}`)
    }
  }, [session, status, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center text-4xl">
            🔒
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            로그인이 필요합니다
          </h2>
          <p className="mt-2 text-gray-600">
            이 페이지에 접근하려면 로그인해주세요.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}