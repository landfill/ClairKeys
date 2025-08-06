import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import backgroundProcessor from '@/services/backgroundProcessor'

// Get specific job status
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const job = await backgroundProcessor.getJobStatus(params.jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if user owns this job
    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })

  } catch (error) {
    console.error('Job status fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}

// Cancel or retry job
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    if (!action || !['cancel', 'retry'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "cancel" or "retry"' },
        { status: 400 }
      )
    }

    let success = false
    let message = ''

    if (action === 'cancel') {
      success = await backgroundProcessor.cancelJob(params.jobId, session.user.id)
      message = success ? 'Job cancelled successfully' : 'Failed to cancel job'
    } else if (action === 'retry') {
      success = await backgroundProcessor.retryJob(params.jobId, session.user.id)
      message = success ? 'Job retry initiated' : 'Failed to retry job'
    }

    if (!success) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Job action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform job action' },
      { status: 500 }
    )
  }
}