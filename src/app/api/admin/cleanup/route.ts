import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { queryOptimizationService } from '@/services/queryOptimizationService'
import { fileStorageService } from '@/services/fileStorageService'
import { cacheService } from '@/services/cacheService'

// Admin cleanup endpoints
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, options = {} } = body

    let result: any = {}

    switch (action) {
      case 'cleanup-old-data':
        // Clean up old database records
        result = await queryOptimizationService.cleanupOldData({
          olderThanDays: options.olderThanDays || 30,
          batchSize: options.batchSize || 100,
          dryRun: options.dryRun || false
        })
        break

      case 'cleanup-temp-files':
        // Clean up temporary files
        result = await fileStorageService.cleanupTempFiles(
          options.olderThanHours || 24
        )
        break

      case 'clear-cache':
        // Clear application cache
        if (options.pattern) {
          cacheService.clearByTags([options.pattern])
        } else {
          cacheService.clear()
        }
        result = { cleared: true, pattern: options.pattern || 'all' }
        break

      case 'optimize-queries':
        // Reset query stats to start fresh monitoring
        queryOptimizationService.resetStats()
        result = { optimized: true, statsReset: true }
        break

      case 'maintenance-report':
        // Generate maintenance report
        const [
          queryStats,
          cacheStats,
          oldDataCount
        ] = await Promise.all([
          queryOptimizationService.getQueryStats(),
          cacheService.getStats(),
          queryOptimizationService.cleanupOldData({
            olderThanDays: options.olderThanDays || 30,
            dryRun: true // Just count, don't delete
          })
        ])

        result = {
          queryPerformance: Object.fromEntries(queryStats),
          cachePerformance: cacheStats,
          cleanupOpportunities: oldDataCount,
          recommendations: generateMaintenanceRecommendations(queryStats, cacheStats, oldDataCount)
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cleanup operation error:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('report')

    switch (reportType) {
      case 'performance':
        const queryStats = queryOptimizationService.getQueryStats()
        const cacheStats = cacheService.getStats()

        return NextResponse.json({
          queries: {
            totalQueries: Array.from(queryStats.values()).reduce((sum, s) => sum + s.count, 0),
            averageResponseTime: Array.from(queryStats.values()).reduce((sum, s) => sum + s.averageTime, 0) / queryStats.size,
            slowQueries: Array.from(queryStats.entries()).filter(([, s]) => s.averageTime > 1000).length,
            queryDetails: Object.fromEntries(queryStats)
          },
          cache: cacheStats,
          timestamp: new Date().toISOString()
        })

      case 'storage':
        // Get storage usage information
        const storageInfo = {
          tempFiles: await fileStorageService.listFiles('temp-uploads'),
          animationFiles: await fileStorageService.listFiles('animation-data'),
          sheetMusicFiles: await fileStorageService.listFiles('sheet-music-files')
        }

        return NextResponse.json({
          storage: {
            tempFiles: storageInfo.tempFiles.length,
            animationFiles: storageInfo.animationFiles.length,
            sheetMusicFiles: storageInfo.sheetMusicFiles.length,
            details: storageInfo
          },
          timestamp: new Date().toISOString()
        })

      case 'health':
        // System health check
        const health = {
          database: await checkDatabaseHealth(),
          storage: await checkStorageHealth(),
          cache: cacheService.getStats(),
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(health)

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Report generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Generate maintenance recommendations
 */
function generateMaintenanceRecommendations(
  queryStats: Map<string, any>,
  cacheStats: any,
  cleanupData: any
): string[] {
  const recommendations: string[] = []

  // Query performance recommendations
  for (const [queryType, stats] of queryStats) {
    if (stats.averageTime > 1000) {
      recommendations.push(`Optimize ${queryType} - average response time is ${stats.averageTime.toFixed(0)}ms`)
    }
    if (stats.errorRate > 0.05) {
      recommendations.push(`Investigate ${queryType} - error rate is ${(stats.errorRate * 100).toFixed(1)}%`)
    }
  }

  // Cache recommendations
  if (cacheStats.hitRate < 70) {
    recommendations.push(`Improve cache strategy - current hit rate is ${cacheStats.hitRate.toFixed(1)}%`)
  }

  if (cacheStats.size > cacheStats.maxSize * 0.9) {
    recommendations.push('Consider increasing cache size - cache is nearly full')
  }

  // Cleanup recommendations
  if (cleanupData.processingJobs > 1000) {
    recommendations.push(`Clean up ${cleanupData.processingJobs} old processing jobs`)
  }

  if (cleanupData.notifications > 500) {
    recommendations.push(`Clean up ${cleanupData.notifications} old notifications`)
  }

  if (recommendations.length === 0) {
    recommendations.push('System performance is optimal - no recommendations at this time')
  }

  return recommendations
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  details: any
}> {
  try {
    const startTime = Date.now()
    
    // Simple query to test database connectivity
    const testQuery = await queryOptimizationService.getOptimizedSheetMusic({
      limit: 1,
      isPublic: true
    })
    
    const responseTime = Date.now() - startTime

    return {
      status: responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy',
      responseTime,
      details: {
        testQueryResults: testQuery.length,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: -1,
      details: {
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  }
}

/**
 * Check storage health
 */
async function checkStorageHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  details: any
}> {
  try {
    // Test storage connectivity by listing files
    const tempFiles = await fileStorageService.listFiles('temp-uploads', '')
    
    return {
      status: 'healthy',
      details: {
        tempFileCount: tempFiles.length,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Storage connection failed'
      }
    }
  }
}