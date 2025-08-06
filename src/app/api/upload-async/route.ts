import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getProcessingQueueService, ProcessingMetadata } from '@/services/processingQueue'
import { getAsyncUploadProcessor } from '@/services/asyncUploadProcessor'

export async function POST(request: NextRequest) {
  try {
    console.log('Async upload API called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const composer = formData.get('composer') as string
    const categoryIdStr = formData.get('category') as string
    const isPublic = formData.get('isPublic') === 'true'

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!composer?.trim()) {
      return NextResponse.json(
        { error: 'Composer is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Parse category ID
    let categoryId: number | undefined = undefined
    if (categoryIdStr && categoryIdStr.trim()) {
      const parsedCategoryId = parseInt(categoryIdStr.trim())
      if (!isNaN(parsedCategoryId)) {
        categoryId = parsedCategoryId
      }
    }

    // Create processing metadata
    const metadata: ProcessingMetadata = {
      filename: file.name,
      fileSize: file.size,
      title: title.trim(),
      composer: composer.trim(),
      categoryId,
      isPublic
    }

    // Get processing queue service
    const processingQueue = getProcessingQueueService()
    
    // Create a new processing job
    const sessionId = await processingQueue.createJob(session.user.id, metadata)
    
    console.log(`Created processing job: ${sessionId}`)

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer)

    // Start async processing
    const asyncProcessor = getAsyncUploadProcessor()
    asyncProcessor.processUpload(sessionId, fileContent, metadata)
      .catch(error => {
        console.error(`Async processing failed for session ${sessionId}:`, error)
        // Error will be handled by the processor and updated in the queue
      })

    // Return session ID immediately
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Upload started - use the session ID to track progress',
      statusEndpoint: `/api/processing-status/${sessionId}`,
      sseEndpoint: `/api/processing-status/${sessionId}` // POST method for SSE
    })

  } catch (error) {
    console.error('Async upload error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    
    return NextResponse.json(
      { error: `업로드 시작 실패: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed - Use POST to start upload' },
    { status: 405 }
  )
}