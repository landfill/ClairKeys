'use client'

/**
 * Push Notifications Component
 * 푸시 알림 구독 및 관리 기능
 */

import { useState, useEffect, useCallback } from 'react'

interface PushNotificationsProps {
  className?: string
  onSubscriptionChange?: (isSubscribed: boolean) => void
}

interface NotificationPermission {
  state: 'default' | 'granted' | 'denied'
  canRequest: boolean
}

export default function PushNotifications({
  className = '',
  onSubscriptionChange
}: PushNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission>({
    state: 'default',
    canRequest: true
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 푸시 알림 지원 여부 확인
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window

      setIsSupported(supported)
    }

    checkSupport()
  }, [])

  // 현재 권한 상태 확인
  useEffect(() => {
    const checkPermission = async () => {
      if (!isSupported) return

      const currentPermission = Notification.permission
      
      setPermission({
        state: currentPermission,
        canRequest: currentPermission === 'default'
      })

      // 현재 구독 상태 확인
      if (currentPermission === 'granted') {
        await checkSubscriptionStatus()
      }
    }

    checkPermission()
  }, [isSupported])

  // 구독 상태 확인
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      const subscribed = !!subscription
      setIsSubscribed(subscribed)
      onSubscriptionChange?.(subscribed)
      
      return subscribed
    } catch (error) {
      console.error('Failed to check subscription status:', error)
      return false
    }
  }, [onSubscriptionChange])

  // 권한 요청
  const requestPermission = useCallback(async () => {
    if (!isSupported || permission.state !== 'default') return false

    try {
      setIsLoading(true)
      const result = await Notification.requestPermission()
      
      setPermission({
        state: result,
        canRequest: false
      })

      return result === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, permission.state])

  // 푸시 알림 구독
  const subscribeToPush = useCallback(async () => {
    if (!isSupported || permission.state !== 'granted') return false

    try {
      setIsLoading(true)
      
      const registration = await navigator.serviceWorker.ready
      
      // VAPID 공개 키 (실제 서비스에서는 환경변수에서 가져와야 함)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM8maLRoKAloQ14v0SqZ2qdOmr4Lrv7l0RLUZc4_0zOzJNhHZXMIgI'
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // 서버에 구독 정보 전송
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          topics: ['practice-reminders', 'new-features', 'updates']
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription on server')
      }

      setIsSubscribed(true)
      onSubscriptionChange?.(true)
      
      // 성공 알림 표시
      showTestNotification('구독 완료', 'ClairKeys 알림을 받을 준비가 완료되었습니다!')
      
      return true
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, permission.state, onSubscriptionChange])

  // 푸시 알림 구독 해제
  const unsubscribeFromPush = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        
        // 서버에서 구독 정보 삭제
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        })
      }

      setIsSubscribed(false)
      onSubscriptionChange?.(false)
      
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [onSubscriptionChange])

  // 테스트 알림 표시
  const showTestNotification = useCallback((title: string, body: string) => {
    if (permission.state === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'clairkeys-test',
        requireInteraction: false,
        silent: false
      })
    }
  }, [permission.state])

  // 알림 테스트
  const testNotification = useCallback(() => {
    showTestNotification(
      'ClairKeys 알림 테스트',
      '알림이 정상적으로 작동합니다! 🎹'
    )
  }, [showTestNotification])

  // 권한이 거부된 경우 안내
  if (permission.state === 'denied') {
    return (
      <div className={`notification-settings bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-orange-800">알림 권한이 차단됨</h4>
            <p className="text-sm text-orange-700 mt-1">
              브라우저 설정에서 알림 권한을 허용해주세요.
            </p>
            <p className="text-xs text-orange-600 mt-2">
              브라우저 주소창 옆의 자물쇠 아이콘 → 알림 → 허용
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 지원되지 않는 경우
  if (!isSupported) {
    return (
      <div className={`notification-settings bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-600">
            현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`notification-settings bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">푸시 알림</h3>
            <p className="text-sm text-gray-600">연습 리마인더 및 업데이트 알림</p>
          </div>
        </div>
        
        {permission.state === 'granted' && !isLoading && (
          <button
            onClick={testNotification}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            테스트
          </button>
        )}
      </div>

      {/* 알림 혜택 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">알림으로 받을 수 있는 내용:</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li className="flex items-center">
            <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>매일 연습 리마인더</span>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>새로운 기능 안내</span>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>업로드 완료 알림</span>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>연습 성과 리포트</span>
          </li>
        </ul>
      </div>

      {/* 알림 설정 버튼 */}
      <div className="space-y-3">
        {permission.state === 'default' && (
          <button
            onClick={async () => {
              const granted = await requestPermission()
              if (granted) {
                await subscribeToPush()
              }
            }}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                설정 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                알림 허용 및 구독
              </>
            )}
          </button>
        )}

        {permission.state === 'granted' && !isSubscribed && (
          <button
            onClick={subscribeToPush}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                구독 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                알림 구독하기
              </>
            )}
          </button>
        )}

        {permission.state === 'granted' && isSubscribed && (
          <div className="space-y-3">
            <div className="flex items-center justify-center py-2 px-4 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">알림 구독 중</span>
            </div>
            
            <button
              onClick={unsubscribeFromPush}
              disabled={isLoading}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? '해제 중...' : '알림 구독 해제'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// VAPID 키 변환 유틸리티
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Hook for using push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window
      setIsSupported(supported)
      
      if (supported) {
        setPermission(Notification.permission)
      }
    }

    checkSupport()
  }, [])

  const requestPermission = useCallback(async () => {
    if (permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    }
    return permission === 'granted'
  }, [permission])

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission
  }
}