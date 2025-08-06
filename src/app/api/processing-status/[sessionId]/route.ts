import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getProcessingQueueService } from '@/services/processingQueue'

interface ProcessingStatusResponse {
  sessionId: string
  stage: string
  progress: number
  message: string
  estimatedTime?: number
  startTime: number
  error?: string
  completed?: boolean
  result?: any
}

export async function GET(
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
    const jobStatus = await processingQueue.getJobStatus(sessionId, session.user.id)

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const response: ProcessingStatusResponse = {
      sessionId: jobStatus.sessionId,
      stage: jobStatus.stage,
      progress: jobStatus.progress,
      message: jobStatus.message,
      estimatedTime: jobStatus.estimatedTime,
      startTime: jobStatus.startTime,
      error: jobStatus.error,
      completed: jobStatus.completed,
      result: jobStatus.result
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Processing status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    )
  }
}

// Server-Sent Events endpoint
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

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(`data: {"type":"connected","sessionId":"${sessionId}"}\n\n`)

        // Set up polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            const jobStatus = await processingQueue.getJobStatus(sessionId, session.user.id)
            
            if (!jobStatus) {
              controller.enqueue(`data: {"type":"error","message":"Session not found"}\n\n`)
              controller.close()
              clearInterval(pollInterval)
              return
            }

            // Send status update
            const statusUpdate = {
              type: 'status',
              sessionId: jobStatus.sessionId,
              stage: jobStatus.stage,
              progress: jobStatus.progress,
              message: jobStatus.message,
              estimatedTime: jobStatus.estimatedTime,
              startTime: jobStatus.startTime,
              error: jobStatus.error,
              completed: jobStatus.completed,
              result: jobStatus.result
            }

            controller.enqueue(`data: ${JSON.stringify(statusUpdate)}\n\n`)

            // Close connection if completed or error
            if (jobStatus.completed || jobStatus.error) {
              clearInterval(pollInterval)
              controller.close()
            }

          } catch (error) {
            console.error('SSE poll error:', error)
            controller.enqueue(`data: {"type":"error","message":"Polling failed"}\n\n`)
            clearInterval(pollInterval)
            controller.close()
          }
        }, 1000) // Poll every second

        // Cleanup on stream close
        return () => {
          clearInterval(pollInterval)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('SSE endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    )
  }
}