/**
 * React hooks for client-side caching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheService } from '@/lib/cache'

interface UseCacheOptions {
  ttl?: number
  version?: string
  storage?: 'memory' | 'localStorage' | 'sessionStorage'
  enabled?: boolean
  staleWhileRevalidate?: boolean
}

interface CacheState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isStale: boolean
  lastUpdated: number | null
}

/**
 * Hook for cached API calls
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    version = '1.0',
    storage = 'memory',
    enabled = true,
    staleWhileRevalidate = true
  } = options

  const [state, setState] = useState<CacheState<T>>({
    data: null,
    loading: true,
    error: null,
    isStale: false,
    lastUpdated: null
  })

  const fetcherRef = useRef(fetcher)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Try cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await cacheService.get<T>(key, { ttl, version, storage })
        if (cached !== null) {
          setState({
            data: cached,
            loading: false,
            error: null,
            isStale: false,
            lastUpdated: Date.now()
          })

          // If stale-while-revalidate is enabled, fetch fresh data in background
          if (staleWhileRevalidate) {
            setTimeout(() => {
              fetchData(true).catch(console.error)
            }, 0)
          }
          return
        }
      }

      // Fetch fresh data
      const freshData = await fetcherRef.current()

      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      // Cache the result
      await cacheService.set(key, freshData, { ttl, version, storage })

      setState({
        data: freshData,
        loading: false,
        error: null,
        isStale: false,
        lastUpdated: Date.now()
      })

    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      const errorObj = error instanceof Error ? error : new Error('Unknown error')
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj
      }))
    }
  }, [key, ttl, version, storage, enabled, staleWhileRevalidate])

  // Initial fetch
  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  const invalidate = useCallback(async () => {
    await cacheService.delete(key, { storage })
    return fetchData(true)
  }, [key, storage, fetchData])

  return {
    ...state,
    refresh,
    invalidate
  }
}

/**
 * Hook for cached data with manual control
 */
export function useCache<T>(key: string, options: UseCacheOptions = {}) {
  const {
    ttl = 5 * 60 * 1000,
    version = '1.0',
    storage = 'memory'
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)

  const get = useCallback(async (): Promise<T | null> => {
    setLoading(true)
    try {
      const cached = await cacheService.get<T>(key, { ttl, version, storage })
      setData(cached)
      return cached
    } finally {
      setLoading(false)
    }
  }, [key, ttl, version, storage])

  const set = useCallback(async (value: T) => {
    setLoading(true)
    try {
      await cacheService.set(key, value, { ttl, version, storage })
      setData(value)
    } finally {
      setLoading(false)
    }
  }, [key, ttl, version, storage])

  const remove = useCallback(async () => {
    setLoading(true)
    try {
      await cacheService.delete(key, { storage })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [key, storage])

  return {
    data,
    loading,
    get,
    set,
    remove
  }
}

/**
 * Hook for cache statistics and management
 */
export function useCacheStats() {
  const [stats, setStats] = useState(cacheService.getStats())

  const refresh = useCallback(() => {
    setStats(cacheService.getStats())
  }, [])

  const clearMemory = useCallback(async () => {
    await cacheService.clear('memory')
    refresh()
  }, [refresh])

  const clearLocalStorage = useCallback(async () => {
    await cacheService.clear('localStorage')
    refresh()
  }, [refresh])

  const clearSessionStorage = useCallback(async () => {
    await cacheService.clear('sessionStorage')
    refresh()
  }, [refresh])

  const clearExpired = useCallback(async () => {
    await Promise.all([
      cacheService.clearExpired('memory'),
      cacheService.clearExpired('localStorage'),
      cacheService.clearExpired('sessionStorage')
    ])
    refresh()
  }, [refresh])

  useEffect(() => {
    // Refresh stats periodically
    const interval = setInterval(refresh, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [refresh])

  return {
    stats,
    refresh,
    clearMemory,
    clearLocalStorage,
    clearSessionStorage,
    clearExpired
  }
}

/**
 * Hook for prefetching data
 */
export function usePrefetch() {
  const prefetch = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    options: UseCacheOptions = {}
  ) => {
    const {
      ttl = 5 * 60 * 1000,
      version = '1.0',
      storage = 'memory'
    } = options

    // Check if already cached
    const cached = await cacheService.get<T>(key, { ttl, version, storage })
    if (cached !== null) {
      return cached
    }

    // Fetch and cache
    try {
      const data = await fetcher()
      await cacheService.set(key, data, { ttl, version, storage })
      return data
    } catch (error) {
      console.warn('Prefetch failed:', error)
      return null
    }
  }, [])

  return { prefetch }
}

export default {
  useCachedFetch,
  useCache,
  useCacheStats,
  usePrefetch
}