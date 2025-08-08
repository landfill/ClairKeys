/**
 * Cache Manager Component
 * Provides cache management UI and service worker registration
 */

'use client'

import { useEffect, useState } from 'react'
import { Button, Card } from '@/components/ui'
import { useCacheStats } from '@/hooks/useCache'

interface ServiceWorkerStats {
  [cacheName: string]: number
}

export default function CacheManager() {
  const { stats, clearMemory, clearLocalStorage, clearSessionStorage, clearExpired } = useCacheStats()
  const [swStats, setSwStats] = useState<ServiceWorkerStats>({})
  const [swRegistered, setSwRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
          setSwRegistered(true)
          
          // Get initial cache stats
          getServiceWorkerStats()
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  // Get service worker cache stats
  const getServiceWorkerStats = async () => {
    if (!navigator.serviceWorker.controller) return

    try {
      const messageChannel = new MessageChannel()
      
      const statsPromise = new Promise<ServiceWorkerStats>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve(event.data.stats)
          } else {
            reject(new Error(event.data.error))
          }
        }
      })

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      )

      const stats = await statsPromise
      setSwStats(stats)
    } catch (error) {
      console.error('Failed to get service worker stats:', error)
    }
  }

  // Clear service worker cache
  const clearServiceWorkerCache = async (cacheName?: string) => {
    if (!navigator.serviceWorker.controller) return

    setLoading(true)
    try {
      const messageChannel = new MessageChannel()
      
      const clearPromise = new Promise<void>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          } else {
            reject(new Error(event.data.error))
          }
        }
      })

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE', payload: { cacheName } },
        [messageChannel.port2]
      )

      await clearPromise
      await getServiceWorkerStats()
    } catch (error) {
      console.error('Failed to clear service worker cache:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">캐시 관리</h2>
        <p className="text-gray-600">
          애플리케이션의 캐시 상태를 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {/* Memory Cache Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">메모리 캐시</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.memorySize}</div>
            <div className="text-sm text-blue-800">캐시된 항목</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.browserStorageSize}</div>
            <div className="text-sm text-green-800">브라우저 저장소</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.maxMemoryItems}</div>
            <div className="text-sm text-purple-800">최대 항목 수</div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearMemory}
            disabled={loading}
          >
            메모리 캐시 지우기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLocalStorage}
            disabled={loading}
          >
            로컬 저장소 지우기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSessionStorage}
            disabled={loading}
          >
            세션 저장소 지우기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearExpired}
            disabled={loading}
          >
            만료된 캐시 정리
          </Button>
        </div>
      </Card>

      {/* Service Worker Cache Stats */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">서비스 워커 캐시</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${swRegistered ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {swRegistered ? '활성' : '비활성'}
            </span>
          </div>
        </div>

        {swRegistered ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {Object.entries(swStats).map(([cacheName, count]) => (
                <div key={cacheName} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600 truncate" title={cacheName}>
                    {cacheName}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearServiceWorkerCache()}
                disabled={loading}
              >
                모든 SW 캐시 지우기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearServiceWorkerCache('clairkeys-static-v1')}
                disabled={loading}
              >
                정적 파일 캐시 지우기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearServiceWorkerCache('clairkeys-api-v1')}
                disabled={loading}
              >
                API 캐시 지우기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={getServiceWorkerStats}
                disabled={loading}
              >
                통계 새로고침
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">서비스 워커가 등록되지 않았습니다</div>
            <div className="text-sm text-gray-400">
              브라우저가 서비스 워커를 지원하지 않거나 등록에 실패했습니다.
            </div>
          </div>
        )}
      </Card>

      {/* Cache Performance Tips */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">캐시 성능 팁</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>정적 파일(이미지, CSS, JS)은 자동으로 1년간 캐시됩니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>API 응답은 5-10분간 캐시되어 빠른 로딩을 제공합니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>애니메이션 데이터는 1시간 캐시되어 재생 성능을 향상시킵니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">ℹ</span>
            <span>만료된 캐시는 자동으로 정리되지만 수동으로도 정리할 수 있습니다</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Hook for service worker cache management
 */
export function useServiceWorkerCache() {
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsRegistered(true)
      })
    }
  }, [])

  const clearCache = async (cacheName?: string) => {
    if (!navigator.serviceWorker.controller) return false

    try {
      const messageChannel = new MessageChannel()
      
      const clearPromise = new Promise<boolean>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success)
        }
      })

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE', payload: { cacheName } },
        [messageChannel.port2]
      )

      return await clearPromise
    } catch (error) {
      console.error('Failed to clear cache:', error)
      return false
    }
  }

  return {
    isRegistered,
    clearCache
  }
}