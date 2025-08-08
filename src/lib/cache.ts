/**
 * Advanced Caching Service
 * Provides multi-level caching with memory, localStorage, and API-level caching
 */

import React from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  version: string
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  version?: string // Cache version for invalidation
  storage?: 'memory' | 'localStorage' | 'sessionStorage'
  compress?: boolean // Compress large data
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_MEMORY_ITEMS = 100
  private readonly COMPRESSION_THRESHOLD = 10000 // 10KB

  /**
   * Get cached data
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { storage = 'memory' } = options
    
    try {
      let item: CacheItem<T> | null = null

      // Try memory cache first (fastest)
      if (storage === 'memory' || storage === 'localStorage' || storage === 'sessionStorage') {
        item = this.memoryCache.get(key) || null
      }

      // Try browser storage if not in memory
      if (!item && typeof window !== 'undefined') {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        const cached = storageObj.getItem(`cache_${key}`)
        
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            item = parsed.compressed ? this.decompress(parsed) : parsed
            
            // Also store in memory for faster access
            if (this.memoryCache.size < this.MAX_MEMORY_ITEMS) {
              this.memoryCache.set(key, item)
            }
          } catch (e) {
            // Invalid cache data, remove it
            storageObj.removeItem(`cache_${key}`)
          }
        }
      }

      if (!item) return null

      // Check if expired
      const now = Date.now()
      if (now > item.timestamp + item.ttl) {
        this.delete(key, { storage })
        return null
      }

      // Check version mismatch
      if (options.version && item.version !== options.version) {
        this.delete(key, { storage })
        return null
      }

      return item.data
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = this.DEFAULT_TTL,
      version = '1.0',
      storage = 'memory',
      compress = false
    } = options

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version
      }

      // Store in memory cache
      if (storage === 'memory' || storage === 'localStorage' || storage === 'sessionStorage') {
        // Implement LRU eviction if memory cache is full
        if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
          const oldestKey = this.memoryCache.keys().next().value
          this.memoryCache.delete(oldestKey)
        }
        
        this.memoryCache.set(key, item)
      }

      // Store in browser storage for persistence
      if (typeof window !== 'undefined' && (storage === 'localStorage' || storage === 'sessionStorage')) {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        
        try {
          let dataToStore = item
          const serialized = JSON.stringify(item)
          
          // Compress if data is large
          if (compress || serialized.length > this.COMPRESSION_THRESHOLD) {
            dataToStore = this.compress(item)
          }
          
          storageObj.setItem(`cache_${key}`, JSON.stringify(dataToStore))
        } catch (e) {
          // Storage quota exceeded, try to clear old items
          this.clearExpired(storage)
          
          // Try again
          try {
            storageObj.setItem(`cache_${key}`, JSON.stringify(item))
          } catch (e2) {
            console.warn('Failed to store in browser storage:', e2)
          }
        }
      }
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const { storage = 'memory' } = options

    try {
      // Remove from memory
      this.memoryCache.delete(key)

      // Remove from browser storage
      if (typeof window !== 'undefined') {
        if (storage === 'localStorage' || storage === 'sessionStorage') {
          const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
          storageObj.removeItem(`cache_${key}`)
        }
      }
    } catch (error) {
      console.warn('Cache delete error:', error)
    }
  }

  /**
   * Clear all cache
   */
  async clear(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): Promise<void> {
    try {
      if (storage === 'memory') {
        this.memoryCache.clear()
      }

      if (typeof window !== 'undefined' && (storage === 'localStorage' || storage === 'sessionStorage')) {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        const keys = Object.keys(storageObj).filter(key => key.startsWith('cache_'))
        keys.forEach(key => storageObj.removeItem(key))
      }
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }

  /**
   * Clear expired items
   */
  async clearExpired(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): Promise<void> {
    const now = Date.now()

    try {
      // Clear expired memory cache
      if (storage === 'memory') {
        for (const [key, item] of this.memoryCache.entries()) {
          if (now > item.timestamp + item.ttl) {
            this.memoryCache.delete(key)
          }
        }
      }

      // Clear expired browser storage
      if (typeof window !== 'undefined' && (storage === 'localStorage' || storage === 'sessionStorage')) {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        const keys = Object.keys(storageObj).filter(key => key.startsWith('cache_'))
        
        keys.forEach(key => {
          try {
            const cached = storageObj.getItem(key)
            if (cached) {
              const item = JSON.parse(cached)
              if (now > item.timestamp + item.ttl) {
                storageObj.removeItem(key)
              }
            }
          } catch (e) {
            // Invalid data, remove it
            storageObj.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.warn('Cache clearExpired error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size
    let browserStorageSize = 0

    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
        browserStorageSize = keys.length
      } catch (e) {
        // Ignore
      }
    }

    return {
      memorySize,
      browserStorageSize,
      maxMemoryItems: this.MAX_MEMORY_ITEMS
    }
  }

  /**
   * Compress data (simple implementation)
   */
  private compress<T>(item: CacheItem<T>): any {
    try {
      // Simple compression by removing whitespace from JSON
      const compressed = JSON.stringify(item).replace(/\s+/g, '')
      return {
        ...item,
        data: compressed,
        compressed: true
      }
    } catch (e) {
      return item
    }
  }

  /**
   * Decompress data
   */
  private decompress<T>(compressedItem: any): CacheItem<T> {
    try {
      if (compressedItem.compressed) {
        const decompressed = JSON.parse(compressedItem.data)
        return {
          ...compressedItem,
          data: decompressed,
          compressed: false
        }
      }
      return compressedItem
    } catch (e) {
      return compressedItem
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
): T {
  const { keyGenerator, ...cacheOptions } = options

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : `${fn.name}_${JSON.stringify(args)}`
    
    // Try to get from cache first
    const cached = await cacheService.get(key, cacheOptions)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    await cacheService.set(key, result, cacheOptions)
    
    return result
  }) as T
}

/**
 * React hook for cached data
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try cache first
        const cached = await cacheService.get<T>(key, options)
        if (cached !== null && mounted) {
          setData(cached)
          setLoading(false)
          return
        }

        // Fetch fresh data
        const freshData = await fetcher()
        if (mounted) {
          setData(freshData)
          await cacheService.set(key, freshData, options)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [key, fetcher, options])

  return { data, loading, error }
}

export default cacheService