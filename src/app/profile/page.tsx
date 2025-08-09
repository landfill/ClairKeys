'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import UserProfile from '@/components/auth/UserProfile'
import Loading from '@/components/ui/Loading'

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Loading />
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            프로필
          </h1>
          <p className="text-gray-600">
            계정 정보를 확인하고 설정을 관리하세요
          </p>
        </div>

        <h1 className="text-4xl font-bold text-center text-gray-900">준비중</h1>
      </div>
    </div>
  )
}