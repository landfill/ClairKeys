import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface PerformanceData {
  metrics: Record<string, number>
  alerts: Array<{
    metric: string
    value: number
    threshold: number
    severity: 'warning' | 'critical'
    timestamp: number
  }>
  userAgent: string
  timestamp: number
  url: string
  userId?: string
}

// In-memory storage for demo (use database in production)
const performanceData: PerformanceData[] = []
const MAX_RECORDS = 1000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const data: PerformanceData = await request.json()

    // Add user info if available
    if (session?.user?.id) {
      data.userId = session.user.id
    }

    // Validate required fields
    if (!data.metrics || !data.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store performance data
    performanceData.push(data)
    
    // Keep only recent records
    if (performanceData.length > MAX_RECORDS) {
      performanceData.splice(0, performanceData.length - MAX_RECORDS)
    }

    // Log critical alerts for monitoring
    const criticalAlerts = data.alerts.filter(alert => alert.severity === 'critical')
    if (criticalAlerts.length > 0) {
      console.warn('Critical performance alerts received:', {
        url: data.url,
        userAgent: data.userAgent,
        alerts: criticalAlerts,
        userId: data.userId
      })
      
      // In production, you might want to:
      // - Send to monitoring service (DataDog, New Relic, etc.)
      // - Store in database
      // - Trigger notifications
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Failed to process performance data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow authenticated users to view analytics
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1h'
    const userId = searchParams.get('userId') || session.user.id

    // Calculate time range
    const now = Date.now()
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    const timeRangeMs = timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['1h']
    const startTime = now - timeRangeMs

    // Filter data
    let filteredData = performanceData.filter(record => 
      record.timestamp >= startTime && 
      (!userId || record.userId === userId)
    )

    // Aggregate metrics
    const aggregatedMetrics = filteredData.reduce((acc, record) => {
      Object.entries(record.metrics).forEach(([metric, value]) => {
        if (!acc[metric]) {
          acc[metric] = { values: [], count: 0, sum: 0 }
        }
        acc[metric].values.push(value)
        acc[metric].count++
        acc[metric].sum += value
      })
      return acc
    }, {} as Record<string, { values: number[], count: number, sum: number }>)

    // Calculate statistics
    const stats = Object.entries(aggregatedMetrics).reduce((acc, [metric, data]) => {
      const values = data.values.sort((a, b) => a - b)
      acc[metric] = {
        average: data.sum / data.count,
        median: values[Math.floor(values.length / 2)],
        p95: values[Math.floor(values.length * 0.95)],
        min: Math.min(...values),
        max: Math.max(...values),
        count: data.count
      }
      return acc
    }, {} as Record<string, any>)

    // Collect alerts
    const alerts = filteredData.flatMap(record => 
      record.alerts.map(alert => ({
        ...alert,
        timestamp: record.timestamp,
        url: record.url,
        userAgent: record.userAgent
      }))
    ).sort((a, b) => b.timestamp - a.timestamp)

    // Performance score calculation
    const performanceScore = calculatePerformanceScore(stats)

    return NextResponse.json({
      timeRange,
      recordCount: filteredData.length,
      stats,
      alerts: alerts.slice(0, 50), // Last 50 alerts
      performanceScore,
      trends: calculateTrends(filteredData, timeRangeMs)
    })

  } catch (error) {
    console.error('Failed to retrieve performance data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculatePerformanceScore(stats: Record<string, any>): number {
  const weights = {
    LCP: 0.3,
    FID: 0.3,
    CLS: 0.2,
    FCP: 0.1,
    TTFB: 0.1
  }

  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  }

  let totalScore = 0
  let totalWeight = 0

  Object.entries(weights).forEach(([metric, weight]) => {
    const stat = stats[metric]
    const threshold = thresholds[metric as keyof typeof thresholds]
    
    if (stat && threshold) {
      const value = stat.average
      let score = 100
      
      if (value > threshold.poor) {
        score = 0
      } else if (value > threshold.good) {
        score = 50 * (1 - (value - threshold.good) / (threshold.poor - threshold.good))
      }
      
      totalScore += score * weight
      totalWeight += weight
    }
  })

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
}

function calculateTrends(data: PerformanceData[], timeRangeMs: number) {
  if (data.length < 2) return {}

  const halfTime = timeRangeMs / 2
  const cutoffTime = Date.now() - halfTime

  const firstHalf = data.filter(record => record.timestamp < cutoffTime)
  const secondHalf = data.filter(record => record.timestamp >= cutoffTime)

  if (firstHalf.length === 0 || secondHalf.length === 0) return {}

  const getAverage = (records: PerformanceData[], metric: string) => {
    const values = records
      .map(r => r.metrics[metric])
      .filter(v => v !== undefined)
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  const trends: Record<string, number> = {}
  const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB']

  metrics.forEach(metric => {
    const firstAvg = getAverage(firstHalf, metric)
    const secondAvg = getAverage(secondHalf, metric)
    
    if (firstAvg > 0) {
      trends[metric] = ((secondAvg - firstAvg) / firstAvg) * 100
    }
  })

  return trends
}