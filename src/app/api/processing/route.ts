import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import backgroundProcessor from '@/services/backgroundProcessor'

// Get user's processing jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const jobs = await backgroundProcessor.getUserJobs(session.user.id, limit)

    return NextResponse.json({
      success: true,
      jobs
    })

  } catch (error) {
    console.error('Processing jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processing jobs' },
      { status: 500 }
    )
  }
}

// Create new background processing job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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
    let categoryId: number | null = null
    if (categoryIdStr && categoryIdStr.trim()) {
      const parsedCategoryId = parseInt(categoryIdStr.trim())
      if (!isNaN(parsedCategoryId)) {
        categoryId = parsedCategoryId
      }
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer)

    // Create background processing job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const jobData = {
      id: jobId,
      userId: session.user.id,
      fileName: file.name,
      fileSize: file.size,
      fileBuffer: fileContent,
      metadata: {
        title: title.trim(),
        composer: composer.trim(),
        categoryId,
        isPublic
      }
    }

    await backgroundProcessor.createJob(jobData)

    return NextResponse.json({
      success: true,
      jobId,
      message: '파일이 백그라운드에서 처리됩니다. 처리 상태는 대시보드에서 확인할 수 있습니다.'
    })

  } catch (error) {
    console.error('Background processing creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create background processing job' },
      { status: 500 }
    )
  }
}