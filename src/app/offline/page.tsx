'use client'

/**
 * Offline Page - PWA 오프라인 상태 안내 페이지
 */

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  // 온라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 온라인 상태로 돌아왔을 때 리다이렉트
  useEffect(() => {
    if (isOnline) {
      // 2초 후에 메인 페이지로 리다이렉트
      const timer = setTimeout(() => {
        window.location.href = '/'
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isOnline])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  if (isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            연결 복구됨!
          </h1>
          <p className="text-gray-600 mb-6">
            인터넷 연결이 복구되었습니다.<br />
            메인 페이지로 이동 중입니다...
          </p>
          <button
            onClick={handleGoHome}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            지금 이동하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        {/* 오프라인 아이콘 */}
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636L5.636 18.364M8.05 8.05L3 3m5.05 5.05L12 12m-3.95-3.95L12 12m6 6l-6-6"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          오프라인 상태
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          인터넷 연결을 확인할 수 없습니다.<br />
          연결 상태를 확인하고 다시 시도해주세요.
        </p>

        {/* 버튼들 */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 시도
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            홈으로 이동
          </button>
        </div>

        {/* 오프라인 기능 안내 */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            오프라인에서도 사용 가능한 기능
          </h3>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>이전에 캐시된 악보 재생</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>피아노 건반 연주 및 소리</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>로컬 연습 세션 기록</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>새 악보 업로드 및 클라우드 동기화는 온라인 상태에서만 가능</span>
            </li>
          </ul>
        </div>

        {/* 연결 상태 표시 */}
        <div className="mt-6 text-sm text-gray-500">
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            <span>오프라인 상태 감지됨</span>
          </div>
        </div>
      </div>
    </div>
  )
}