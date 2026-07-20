'use client'

/**
 * PWA Install Prompt Component
 * 앱 설치 유도 및 PWA 기능 안내
 */

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

interface PWAInstallPromptProps {
  className?: string
  showAsModal?: boolean
  autoShow?: boolean
  onInstall?: () => void
  onDismiss?: () => void
}

export default function PWAInstallPrompt({
  className = '',
  showAsModal = false,
  autoShow = true,
  onInstall,
  onDismiss
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [platformInfo, setPlatformInfo] = useState<{
    isIOS: boolean
    isAndroid: boolean
    browser: string
  }>({
    isIOS: false,
    isAndroid: false,
    browser: ''
  })

  // 플랫폼 및 브라우저 감지
  useEffect(() => {
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)
    
    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'chrome'
    else if (userAgent.includes('Safari')) browser = 'safari'
    else if (userAgent.includes('Firefox')) browser = 'firefox'
    else if (userAgent.includes('Edge')) browser = 'edge'

    setPlatformInfo({ isIOS, isAndroid, browser })
  }, [])

  // PWA 설치 상태 확인
  useEffect(() => {
    // PWA로 실행 중인지 확인
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (navigator as Navigator & { standalone?: boolean }).standalone ||
                              document.referrer.includes('android-app://')

    setIsInstalled(!!isInStandaloneMode)
  }, [])

  // BeforeInstallPrompt 이벤트 리스너
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
      
      if (autoShow && !isInstalled) {
        // 2초 후에 자동으로 프롬프트 표시
        setTimeout(() => setShowPrompt(true), 2000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [autoShow, isInstalled])

  // 앱 설치 후 이벤트 처리
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('ClairKeys PWA installed successfully')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      onInstall?.()
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstall])

  // 설치 프롬프트 실행
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      // 브라우저 설치 프롬프트 표시
      await deferredPrompt.prompt()
      
      // 사용자 선택 결과 대기
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        onInstall?.()
      } else {
        console.log('User dismissed the install prompt')
        onDismiss?.()
      }
      
      // 프롬프트 정리
      setDeferredPrompt(null)
      setShowPrompt(false)
      
    } catch (error) {
      console.error('Error during PWA installation:', error)
    }
  }, [deferredPrompt, onInstall, onDismiss])

  // 프롬프트 닫기
  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    onDismiss?.()
  }, [onDismiss])

  // iOS Safari 수동 설치 안내
  const IOSInstallInstructions = () => (
    <div className="text-left space-y-3">
      <p className="font-medium text-gray-800">Safari에서 ClairKeys를 홈 화면에 추가하려면:</p>
      <ol className="space-y-2 text-sm text-gray-600">
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">1</span>
          <span>하단 공유 버튼 <svg className="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg> 을 탭하세요</span>
        </li>
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">2</span>
          <span>&quot;홈 화면에 추가&quot; 옵션을 선택하세요</span>
        </li>
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">3</span>
          <span>&quot;추가&quot; 버튼을 탭하여 완료하세요</span>
        </li>
      </ol>
    </div>
  )

  // Android Chrome 수동 설치 안내
  const AndroidInstallInstructions = () => (
    <div className="text-left space-y-3">
      <p className="font-medium text-gray-800">Chrome에서 ClairKeys를 설치하려면:</p>
      <ol className="space-y-2 text-sm text-gray-600">
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">1</span>
          <span>우상단 메뉴 (⋮) 버튼을 탭하세요</span>
        </li>
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">2</span>
          <span>&quot;앱 설치&quot; 또는 &quot;홈 화면에 추가&quot; 옵션을 선택하세요</span>
        </li>
        <li className="flex items-start">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs mr-2 mt-0.5">3</span>
          <span>&quot;설치&quot; 버튼을 탭하여 완료하세요</span>
        </li>
      </ol>
    </div>
  )

  // PWA 혜택 안내
  const PWABenefits = () => (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
      <h4 className="font-semibold text-blue-800 mb-3">앱 설치시 혜택:</h4>
      <ul className="space-y-2 text-sm text-blue-700">
        <li className="flex items-start">
          <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>오프라인에서도 피아노 연주 및 연습 가능</span>
        </li>
        <li className="flex items-start">
          <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>홈 화면에서 바로 접근</span>
        </li>
        <li className="flex items-start">
          <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>더 빠른 로딩 속도</span>
        </li>
        <li className="flex items-start">
          <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>전체화면 앱과 같은 경험</span>
        </li>
      </ul>
    </div>
  )

  // 이미 설치된 경우 아무것도 표시하지 않음
  if (isInstalled) return null

  // 프롬프트를 표시하지 않는 경우
  if (!showPrompt) {
    return (
      <button
        onClick={() => setShowPrompt(true)}
        className={`install-trigger bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${className}`}
      >
        📱 앱 설치
      </button>
    )
  }

  const content = (
    <div className="install-prompt">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">ClairKeys 앱 설치</h3>
          <p className="text-sm text-gray-600">더 편리한 피아노 학습을 위해</p>
        </div>
      </div>

      <PWABenefits />

      {/* 설치 버튼 또는 수동 설치 안내 */}
      <div className="mt-6">
        {isInstallable && deferredPrompt ? (
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              지금 설치하기
            </button>
            <button
              onClick={handleDismiss}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              나중에 하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {platformInfo.isIOS && <IOSInstallInstructions />}
            {platformInfo.isAndroid && <AndroidInstallInstructions />}
            
            <button
              onClick={handleDismiss}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors mt-4"
            >
              나중에 하기
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border ${className}`}>
      {content}
    </div>
  )
}

// PWA 상태를 확인하는 Hook
export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // PWA 설치 상태 확인
    const checkInstallStatus = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                                (navigator as Navigator & { standalone?: boolean }).standalone ||
                                document.referrer.includes('android-app://')
      setIsInstalled(!!isInStandaloneMode)
    }

    // 온라인/오프라인 상태 확인
    const checkOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    // BeforeInstallPrompt 이벤트로 설치 가능 여부 확인
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setIsInstallable(true)
    }

    checkInstallStatus()
    checkOnlineStatus()

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)
    window.addEventListener('appinstalled', checkInstallStatus)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
      window.removeEventListener('appinstalled', checkInstallStatus)
    }
  }, [])

  return { isInstalled, isInstallable, isOffline }
}