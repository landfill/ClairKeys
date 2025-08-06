import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getProcessingQueueService } from '@/services/processingQueue'

// Get user's processing jobs
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

    const processingQueue = getProcessingQueueService()
    const userJobs = await processingQueue.getUserJobs(session.user.id)

    return NextResponse.json({
      jobs: userJobs,
      total: userJobs.length
    })

  } catch (error) {
    console.error('Get processing queue error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processing queue' },
      { status: 500 }
    )
  }
}

// Get queue statistics (admin only, for now just return basic stats)
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

    const processingQueue = getProcessingQueueService()
    const stats = processingQueue.getQueueStats()

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get queue stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue statistics' },
      { status: 500 }
    )
  }
}