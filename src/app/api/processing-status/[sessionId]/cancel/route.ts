import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getProcessingQueueService } from '@/services/processingQueue'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = params
    const processingQueue = getProcessingQueueService()

    // Cancel the job
    const cancelled = await processingQueue.cancelJob(sessionId, session.user.id)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    console.log(`Job cancelled by user: ${sessionId}`)

    return NextResponse.json({
      success: true,
      message: 'Processing cancelled successfully',
      sessionId
    })

  } catch (error) {
    console.error('Cancel processing error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel processing' },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed - Use POST to cancel processing' },
    { status: 405 }
  )
}