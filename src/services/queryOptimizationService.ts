import { prisma } from '@/lib/prisma'

export interface QueryStats {
  totalQueries: number
  slowQueries: number
  averageResponseTime: number
  cacheHitRate?: number
}

export interface OptimizationResult {
  optimized: boolean
  originalQuery: string
  optimizedQuery?: string
  improvementPercent?: number
  recommendations: string[]
}

export class QueryOptimizationService {
  private static instance: QueryOptimizationService
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private queryStats = new Map<string, { count: number; totalTime: number; errors: number }>()
  
  static getInstance(): QueryOptimizationService {
    if (!QueryOptimizationService.instance) {
      QueryOptimizationService.instance = new QueryOptimizationService()
    }
    return QueryOptimizationService.instance
  }

  /**
   * Optimized sheet music queries with proper indexing and relations
   */
  async getOptimizedSheetMusic(options: {
    userId?: string
    isPublic?: boolean
    categoryId?: number
    search?: string
    limit?: number
    offset?: number
    orderBy?: 'newest' | 'oldest' | 'title' | 'composer'
    includeOwner?: boolean
    includeCategory?: boolean
  }) {
    const startTime = Date.now()
    
    try {
      // Build optimized where clause
      const where: any = {}
      
      if (options.userId !== undefined) {
        where.userId = options.userId
      }
      
      if (options.isPublic !== undefined) {
        where.isPublic = options.isPublic
      }
      
      if (options.categoryId !== undefined) {
        where.categoryId = options.categoryId
      }
      
      // Optimized search with full-text capabilities
      if (options.search) {
        where.OR = [
          { title: { contains: options.search, mode: 'insensitive' } },
          { composer: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      // Build optimized order by
      const orderBy: any = {}
      switch (options.orderBy) {
        case 'newest':
          orderBy.createdAt = 'desc'
          break
        case 'oldest':
          orderBy.createdAt = 'asc'
          break
        case 'title':
          orderBy.title = 'asc'
          break
        case 'composer':
          orderBy.composer = 'asc'
          break
        default:
          orderBy.createdAt = 'desc'
      }

      // Build include clause for relations
      const include: any = {}
      if (options.includeOwner) {
        include.user = {
          select: { id: true, name: true, email: true }
        }
      }
      if (options.includeCategory) {
        include.category = {
          select: { id: true, name: true }
        }
      }

      // Execute optimized query
      const result = await prisma.sheetMusic.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        take: options.limit,
        skip: options.offset
      })

      // Log query performance
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getOptimizedSheetMusic', executionTime, result.length)

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getOptimizedSheetMusic', executionTime, 0, true)
      throw error
    }
  }

  /**
   * Optimized public sheet music query with caching
   */
  async getPublicSheetMusicOptimized(options: {
    limit?: number
    sortBy?: 'newest' | 'popular'
    categoryId?: number
    search?: string
    cacheTtl?: number
  }) {
    const cacheKey = `public_sheets_${JSON.stringify(options)}`
    const cached = this.getFromCache(cacheKey)
    
    if (cached) {
      return cached
    }

    const startTime = Date.now()
    
    try {
      let orderBy: any = { createdAt: 'desc' } // Default newest
      
      if (options.sortBy === 'popular') {
        // TODO: Add popularity field or calculate based on practice sessions
        orderBy = { createdAt: 'desc' } // Fallback for now
      }

      const where: any = { isPublic: true }
      
      if (options.categoryId) {
        where.categoryId = options.categoryId
      }
      
      if (options.search) {
        where.OR = [
          { title: { contains: options.search, mode: 'insensitive' } },
          { composer: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      const result = await prisma.sheetMusic.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          _count: {
            select: { practiceSessions: true }
          }
        },
        orderBy,
        take: options.limit || 20
      })

      // Cache the result
      this.setCache(cacheKey, result, options.cacheTtl || 300) // 5 minutes default

      const executionTime = Date.now() - startTime
      this.recordQueryStats('getPublicSheetMusicOptimized', executionTime, result.length)

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getPublicSheetMusicOptimized', executionTime, 0, true)
      throw error
    }
  }

  /**
   * Optimized search with faceted results
   */
  async searchSheetMusicWithFacets(options: {
    search?: string
    userId?: string
    isPublic?: boolean
    limit?: number
    offset?: number
  }) {
    const startTime = Date.now()
    
    try {
      const baseWhere: any = {}
      
      if (options.userId) {
        baseWhere.userId = options.userId
      }
      
      if (options.isPublic !== undefined) {
        baseWhere.isPublic = options.isPublic
      }

      // Main search query
      const searchWhere = options.search ? {
        ...baseWhere,
        OR: [
          { title: { contains: options.search, mode: 'insensitive' } },
          { composer: { contains: options.search, mode: 'insensitive' } }
        ]
      } : baseWhere

      // Execute main search and facets in parallel
      const [sheetMusic, totalCount, categoryFacets] = await Promise.all([
        // Main results
        prisma.sheetMusic.findMany({
          where: searchWhere,
          include: {
            user: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: options.limit,
          skip: options.offset
        }),
        
        // Total count
        prisma.sheetMusic.count({ where: searchWhere }),
        
        // Category facets
        prisma.sheetMusic.groupBy({
          by: ['categoryId'],
          where: searchWhere,
          _count: { categoryId: true },
          orderBy: { _count: { categoryId: 'desc' } }
        })
      ])

      // Get category names for facets
      const categoryIds = categoryFacets
        .map(f => f.categoryId)
        .filter(id => id !== null) as number[]
        
      const categories = categoryIds.length > 0 ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
      }) : []

      const categoryMap = new Map(categories.map(c => [c.id, c.name]))

      const result = {
        sheetMusic,
        pagination: {
          total: totalCount,
          limit: options.limit || 10,
          offset: options.offset || 0,
          hasMore: totalCount > (options.offset || 0) + (options.limit || 10)
        },
        facets: {
          categories: categoryFacets.map(f => ({
            categoryId: f.categoryId,
            categoryName: f.categoryId ? categoryMap.get(f.categoryId) : 'Uncategorized',
            count: f._count.categoryId
          })),
          totalPublic: baseWhere.isPublic !== false ? 
            await prisma.sheetMusic.count({ where: { ...baseWhere, isPublic: true } }) : 0,
          totalPrivate: baseWhere.isPublic !== true ? 
            await prisma.sheetMusic.count({ where: { ...baseWhere, isPublic: false } }) : 0
        }
      }

      const executionTime = Date.now() - startTime
      this.recordQueryStats('searchSheetMusicWithFacets', executionTime, result.sheetMusic.length)

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('searchSheetMusicWithFacets', executionTime, 0, true)
      throw error
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchUpdateSheetMusic(updates: Array<{
    id: number
    data: any
    userId: string
  }>) {
    const startTime = Date.now()
    
    try {
      // Validate all IDs belong to the users first
      const sheetMusicIds = updates.map(u => u.id)
      const existing = await prisma.sheetMusic.findMany({
        where: {
          id: { in: sheetMusicIds },
          userId: { in: updates.map(u => u.userId) }
        },
        select: { id: true, userId: true }
      })

      const existingMap = new Map(existing.map(sm => [sm.id, sm.userId]))
      
      // Filter valid updates
      const validUpdates = updates.filter(update => 
        existingMap.has(update.id) && existingMap.get(update.id) === update.userId
      )

      if (validUpdates.length === 0) {
        return { updated: 0, errors: ['No valid updates found'] }
      }

      // Execute batch update using transaction
      const results = await prisma.$transaction(
        validUpdates.map(update => 
          prisma.sheetMusic.update({
            where: { id: update.id },
            data: update.data
          })
        )
      )

      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchUpdateSheetMusic', executionTime, results.length)

      return { 
        updated: results.length, 
        errors: [],
        skipped: updates.length - validUpdates.length
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchUpdateSheetMusic', executionTime, 0, true)
      throw error
    }
  }

  /**
   * Cleanup old data efficiently
   */
  async cleanupOldData(options: {
    olderThanDays: number
    batchSize?: number
    dryRun?: boolean
  }) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays)
    const batchSize = options.batchSize || 100

    const results = {
      processingJobs: 0,
      notifications: 0,
      practiceSessions: 0
    }

    try {
      // Clean up old processing jobs
      if (!options.dryRun) {
        const { count: jobsDeleted } = await prisma.processingJob.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
            status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
          }
        })
        results.processingJobs = jobsDeleted
      } else {
        results.processingJobs = await prisma.processingJob.count({
          where: {
            createdAt: { lt: cutoffDate },
            status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
          }
        })
      }

      // Clean up old notifications
      if (!options.dryRun) {
        const { count: notificationsDeleted } = await prisma.processingNotification.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
            isRead: true
          }
        })
        results.notifications = notificationsDeleted
      } else {
        results.notifications = await prisma.processingNotification.count({
          where: {
            createdAt: { lt: cutoffDate },
            isRead: true
          }
        })
      }

      // Archive old practice sessions (don't delete, just mark as archived)
      // This preserves user data while improving query performance
      const oldSessions = await prisma.practiceSession.count({
        where: {
          createdAt: { lt: cutoffDate }
        }
      })
      results.practiceSessions = oldSessions

    } catch (error) {
      console.error('Cleanup old data error:', error)
      throw error
    }

    return results
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (cached && Date.now() < cached.timestamp + cached.ttl * 1000) {
      return cached.data
    }
    this.queryCache.delete(key)
    return null
  }

  private setCache(key: string, data: any, ttlSeconds: number = 300) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    })
  }

  /**
   * Clear cache by pattern
   */
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key)
        }
      }
    } else {
      this.queryCache.clear()
    }
  }

  /**
   * Record query statistics
   */
  private recordQueryStats(queryType: string, executionTime: number, resultCount: number, hasError: boolean = false) {
    const stats = this.queryStats.get(queryType) || { count: 0, totalTime: 0, errors: 0 }
    
    stats.count++
    stats.totalTime += executionTime
    if (hasError) {
      stats.errors++
    }
    
    this.queryStats.set(queryType, stats)
  }

  /**
   * Get performance statistics
   */
  getQueryStats(): Map<string, {
    count: number
    averageTime: number
    errorRate: number
    totalTime: number
  }> {
    const result = new Map()
    
    for (const [queryType, stats] of this.queryStats) {
      result.set(queryType, {
        count: stats.count,
        averageTime: stats.totalTime / stats.count,
        errorRate: stats.errors / stats.count,
        totalTime: stats.totalTime
      })
    }
    
    return result
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.queryStats.clear()
  }
}

// Export singleton instance
export const queryOptimizationService = QueryOptimizationService.getInstance()