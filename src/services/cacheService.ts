interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  evictions: number
  hitRate: number
}

export class CacheService {
  private static instance: CacheService
  private cache = new Map<string, CacheEntry<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    hitRate: 0
  }
  private maxSize: number = 1000
  private cleanupInterval: NodeJS.Timeout

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  static getInstance(maxSize?: number): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(maxSize)
    }
    return CacheService.instance
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl * 1000) {
      this.cache.delete(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    
    this.stats.hits++
    this.updateHitRate()
    
    return entry.data
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, options: {
    ttl?: number // seconds
    tags?: string[]
  } = {}): void {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || 300, // default 5 minutes
      tags: options.tags || [],
      accessCount: 0,
      lastAccessed: Date.now()
    }

    this.cache.set(key, entry)
    this.stats.sets++
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
        cleared++
      }
    }
    
    return cleared
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Get or set with async function
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
    } = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch and cache
    try {
      const data = await fetcher()
      this.set(key, data, options)
      return data
    } catch (error) {
      // Don't cache errors
      throw error
    }
  }

  /**
   * Memoize function with caching
   */
  memoize<Args extends any[], Return>(
    fn: (...args: Args) => Promise<Return>,
    options: {
      keyGenerator?: (...args: Args) => string
      ttl?: number
      tags?: string[]
    } = {}
  ) {
    const keyGen = options.keyGenerator || ((...args) => JSON.stringify(args))
    
    return async (...args: Args): Promise<Return> => {
      const key = `memoized_${fn.name}_${keyGen(...args)}`
      
      return this.getOrSet(
        key,
        () => fn(...args),
        {
          ttl: options.ttl,
          tags: options.tags
        }
      )
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl * 1000) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`)
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruTime = Date.now()
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey)
      this.stats.evictions++
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    size: number
    maxSize: number
    memoryUsage: number
  } {
    // Estimate memory usage
    let memoryUsage = 0
    for (const [key, entry] of this.cache) {
      memoryUsage += key.length * 2 // String chars are 2 bytes
      memoryUsage += JSON.stringify(entry.data).length * 2
      memoryUsage += 64 // Rough estimate for entry metadata
    }

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      hitRate: 0
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{
    key: string
    size: number
    ttl: number
    age: number
    accessCount: number
    tags: string[]
  }> {
    const now = Date.now()
    const entries = []
    
    for (const [key, entry] of this.cache) {
      entries.push({
        key,
        size: JSON.stringify(entry.data).length,
        ttl: entry.ttl,
        age: (now - entry.timestamp) / 1000,
        accessCount: entry.accessCount,
        tags: entry.tags
      })
    }
    
    return entries
  }
}

// Specialized cache instances
export class SheetMusicCache {
  private cache = CacheService.getInstance()
  
  // Cache keys
  private static KEYS = {
    PUBLIC_SHEETS: 'public_sheets',
    USER_SHEETS: (userId: string) => `user_sheets_${userId}`,
    SEARCH_RESULTS: (query: string) => `search_${query}`,
    SHEET_DETAIL: (id: number) => `sheet_${id}`,
    CATEGORIES: (userId: string) => `categories_${userId}`,
    ANIMATION_DATA: (id: number) => `animation_${id}`
  }

  /**
   * Cache public sheet music
   */
  setPublicSheets(data: any, ttl: number = 300) {
    this.cache.set(SheetMusicCache.KEYS.PUBLIC_SHEETS, data, {
      ttl,
      tags: ['public', 'sheets']
    })
  }

  getPublicSheets(): any {
    return this.cache.get(SheetMusicCache.KEYS.PUBLIC_SHEETS)
  }

  /**
   * Cache user sheet music
   */
  setUserSheets(userId: string, data: any, ttl: number = 600) {
    this.cache.set(SheetMusicCache.KEYS.USER_SHEETS(userId), data, {
      ttl,
      tags: ['user', `user_${userId}`, 'sheets']
    })
  }

  getUserSheets(userId: string): any {
    return this.cache.get(SheetMusicCache.KEYS.USER_SHEETS(userId))
  }

  /**
   * Cache search results
   */
  setSearchResults(query: string, data: any, ttl: number = 180) {
    this.cache.set(SheetMusicCache.KEYS.SEARCH_RESULTS(query), data, {
      ttl,
      tags: ['search', 'sheets']
    })
  }

  getSearchResults(query: string): any {
    return this.cache.get(SheetMusicCache.KEYS.SEARCH_RESULTS(query))
  }

  /**
   * Cache sheet music detail
   */
  setSheetDetail(id: number, data: any, ttl: number = 900) {
    this.cache.set(SheetMusicCache.KEYS.SHEET_DETAIL(id), data, {
      ttl,
      tags: ['sheet', `sheet_${id}`]
    })
  }

  getSheetDetail(id: number): any {
    return this.cache.get(SheetMusicCache.KEYS.SHEET_DETAIL(id))
  }

  /**
   * Cache animation data
   */
  setAnimationData(id: number, data: any, ttl: number = 3600) {
    this.cache.set(SheetMusicCache.KEYS.ANIMATION_DATA(id), data, {
      ttl,
      tags: ['animation', `sheet_${id}`]
    })
  }

  getAnimationData(id: number): any {
    return this.cache.get(SheetMusicCache.KEYS.ANIMATION_DATA(id))
  }

  /**
   * Invalidate user-related caches
   */
  invalidateUser(userId: string) {
    this.cache.clearByTags([`user_${userId}`])
  }

  /**
   * Invalidate sheet-related caches
   */
  invalidateSheet(id: number) {
    this.cache.clearByTags([`sheet_${id}`])
  }

  /**
   * Invalidate search caches
   */
  invalidateSearch() {
    this.cache.clearByTags(['search'])
  }

  /**
   * Invalidate public sheet caches
   */
  invalidatePublic() {
    this.cache.clearByTags(['public'])
  }
}

// Export instances
export const cacheService = CacheService.getInstance()
export const sheetMusicCache = new SheetMusicCache()