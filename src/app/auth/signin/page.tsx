'use client'

import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toSafeReturnPath } from '@/lib/returnPath'
import { CheckIcon, LogoMark, StatusState } from '@/components/ui'

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  // 복귀 대상은 쿼리로 들어온다. 검증 없이 리다이렉트하면 오픈 리다이렉트가 된다.
  const callbackUrl = toSafeReturnPath(searchParams.get('callbackUrl'))
  const error = searchParams.get('error')

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
      setLoading(false)
    }

    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
      }
    }

    checkSession()
    fetchProviders()
  }, [callbackUrl, router])

  const handleSignIn = async (providerId: string) => {
    try {
      await signIn(providerId, { callbackUrl })
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'OAuthSignin':
        return '소셜 로그인 중 오류가 발생했습니다.'
      case 'OAuthCallback':
        return '소셜 로그인 콜백 처리 중 오류가 발생했습니다.'
      case 'OAuthCreateAccount':
        return '계정 생성 중 오류가 발생했습니다.'
      case 'EmailCreateAccount':
        return '이메일 계정 생성 중 오류가 발생했습니다.'
      case 'Callback':
        return '콜백 처리 중 오류가 발생했습니다.'
      case 'OAuthAccountNotLinked':
        return '이미 다른 방법으로 가입된 이메일입니다. 기존 방법으로 로그인해주세요.'
      case 'EmailSignin':
        return '이메일 로그인 중 오류가 발생했습니다.'
      case 'CredentialsSignin':
        return '로그인 정보가 올바르지 않습니다.'
      case 'SessionRequired':
        return '로그인이 필요합니다.'
      default:
        return '로그인 중 오류가 발생했습니다.'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" />
            <p className="mt-4 text-ink-muted">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/*
          일반 인증 화면이 아니라 업로드 여정의 다음 단계로 읽혀야 한다. 계정을 만드는 것이 목적이
          아니라 악보를 맡기기 위한 절차임을 여기서 말한다.
        */}
        <div>
          <LogoMark size={32} className="mx-auto text-accent" />
          <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-ink">
            악보를 맡기기 전에 로그인해 주세요
          </h1>
          <ul className="mt-6 space-y-3">
            {[
              '변환한 악보를 계정에 저장해 다음에 다시 찾을 수 있습니다.',
              '변환은 1~3분 걸립니다. 페이지를 닫아도 계속 처리됩니다.',
              '내 악보는 공개로 설정하기 전까지 나에게만 보입니다.',
            ].map((reason) => (
              <li key={reason} className="flex gap-3 text-sm text-ink-muted">
                <CheckIcon size={18} className="mt-0.5 shrink-0 text-state-ready" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <StatusState title="로그인하지 못했습니다" detail={`${getErrorMessage(error)} 다시 시도해 주세요.`} tone="error" />
        )}
        {/*
          <div className="rounded-md border border-state-error/40 bg-surface p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-state-error" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-state-error">
                  로그인 오류
                </h3>
                <div className="mt-2 text-sm text-ink-muted">
                  <p>{getErrorMessage(error)}</p>
                </div>
              </div>
            </div>
          </div>*/}

        <div className="mt-8 space-y-4">
          {providers && Object.values(providers).map((provider) => (
            <div key={provider.name}>
              <button
                onClick={() => handleSignIn(provider.id)}
                className="w-full flex justify-center py-3 px-4 border border-rule-strong text-sm font-medium rounded-md text-ink bg-surface hover:bg-surface-muted transition-colors"
              >
                {provider.name}로 계속하기
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-accent hover:text-accent-hover">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" />
            <p className="mt-4 text-ink-muted">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
