'use client'

import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
  const callbackUrl = searchParams.get('callbackUrl') || '/'
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

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return '🔍'
      case 'github':
        return '🐙'
      default:
        return '🔑'
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center text-2xl">
            🎹
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Clairkeys에 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            PDF 악보를 피아노 애니메이션으로 변환하여 학습하세요
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  로그인 오류
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{getErrorMessage(error)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {providers && Object.values(providers).map((provider) => (
            <div key={provider.name}>
              <button
                onClick={() => handleSignIn(provider.id)}
                className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <span className="text-xl">
                    {getProviderIcon(provider.id)}
                  </span>
                </span>
                {provider.name}로 로그인
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link 
            href="/"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}