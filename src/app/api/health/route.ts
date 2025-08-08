import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        usage: process.memoryUsage(),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      },
      checks: {
        database: 'unknown',
        storage: 'unknown',
        performance: 'unknown'
      }
    }

    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`
      healthStatus.checks.database = 'healthy'
    } catch (error) {
      healthStatus.checks.database = 'unhealthy'
      console.error('Database health check failed:', error)
    }

    // Storage connectivity check (Supabase)
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        // Basic connectivity check - just verify credentials exist
        healthStatus.checks.storage = 'healthy'
      } else {
        healthStatus.checks.storage = 'misconfigured'
      }
    } catch (error) {
      healthStatus.checks.storage = 'unhealthy'
      console.error('Storage health check failed:', error)
    }

    // Performance monitoring check
    try {
      const memUsed = process.memoryUsage().heapUsed / 1024 / 1024
      if (memUsed > 512) {
        healthStatus.checks.performance = 'warning'
      } else {
        healthStatus.checks.performance = 'healthy'
      }
    } catch (error) {
      healthStatus.checks.performance = 'unknown'
    }

    // Determine overall status
    const allHealthy = Object.values(healthStatus.checks).every(check => check === 'healthy')
    if (!allHealthy) {
      healthStatus.status = 'degraded'
    }

    const statusCode = allHealthy ? 200 : 503

    return NextResponse.json(healthStatus, { status: statusCode })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal health check error',
      checks: {
        database: 'unknown',
        storage: 'unknown',
        performance: 'unknown'
      }
    }, { status: 503 })
  }
}