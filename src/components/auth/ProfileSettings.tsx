'use client'

import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'

export default function ProfileSettings() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
  })

  if (!session?.user) {
    return null
  }

  const { user } = session

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 프로필 헤더 */}
      <div className="px-6 py-8 border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="relative">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-600">
                  {(user.name || user.email)?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {user.name || '이름 없음'}
            </h2>
            <p className="text-gray-600 mb-3">{user.email}</p>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              프로필 편집
            </button>
          </div>
        </div>
      </div>

      {/* 기본 정보 섹션 */}
      <div className="px-6 py-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                disabled
              />
              <p className="mt-1 text-sm text-gray-500">
                이메일은 변경할 수 없습니다.
              </p>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                저장
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <dt className="text-sm font-medium text-gray-500">이름</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name || '설정되지 않음'}</dd>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <dt className="text-sm font-medium text-gray-500">이메일</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <dt className="text-sm font-medium text-gray-500">가입일</dt>
                <dd className="mt-1 text-sm text-gray-900">2024년 1월 1일</dd>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 계정 설정 섹션 */}
      <div className="px-6 py-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">계정 설정</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900">비밀번호 변경</h4>
              <p className="text-sm text-gray-500">계정 보안을 위해 정기적으로 비밀번호를 변경하세요</p>
            </div>
            <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              변경
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900">이메일 알림</h4>
              <p className="text-sm text-gray-500">새로운 악보 업데이트와 중요한 공지를 받아보세요</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                id="email-notifications"
                defaultChecked
              />
              <label
                htmlFor="email-notifications"
                className="flex items-center cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-6 bg-blue-600 rounded-full shadow-inner"></div>
                  <div className="absolute w-4 h-4 bg-white rounded-full shadow inset-y-1 right-1"></div>
                </div>
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900">푸시 알림</h4>
              <p className="text-sm text-gray-500">브라우저를 통해 실시간 알림을 받아보세요</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                id="push-notifications"
              />
              <label
                htmlFor="push-notifications"
                className="flex items-center cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-6 bg-gray-300 rounded-full shadow-inner"></div>
                  <div className="absolute w-4 h-4 bg-white rounded-full shadow inset-y-1 left-1"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 위험 구역 */}
      <div className="px-6 py-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-red-600 mb-4">위험 구역</h3>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                계정 삭제
              </h4>
              <p className="text-sm text-red-700 mb-3">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
              <button className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                계정 삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}