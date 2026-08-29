import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { getOmrServiceUrl, omrAuthHeaders, OmrServiceNotConfiguredError } from '@/lib/omr/serviceUrl'

/**
 * Marks a row this request created as failed.
 *
 * The row is created before the OMR call because the service is given
 * `sheet_music_id`, so the id has to exist first. That ordering is load-bearing
 * and must not be reversed — what it needs instead is a cleanup on every exit
 * that does not hand the row to a job. Without it the row sits at
 * `processing` with no `omrJobId`, which `/api/omr/status/[jobId]` looks rows
 * up by, so nothing can ever move it again.
 */
async function markFailed(sheetMusicId: number): Promise<void> {
  try {
    await prisma.sheetMusic.update({
      where: { id: sheetMusicId },
      data: {
        processingStatus: 'failed',
        updatedAt: new Date()
      }
    })
  } catch (error) {
    // Losing the database as well is worth logging, but the caller is already
    // returning a failure and should not have it replaced by this one.
    console.error('Failed to mark sheet music as failed:', sheetMusicId, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use OAuth ID as user identifier
    const userId = session.user.id || session.user.email || 'anonymous'

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const composer = formData.get('composer') as string
    const tempoField = formData.get('tempo')
    const categoryId = formData.get('categoryId') as string
    const isPublic = formData.get('isPublic') === 'true'

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (tempoField !== null && typeof tempoField !== 'string') {
      return NextResponse.json(
        {
          error: '빠르기는 20에서 400 사이의 숫자로 입력해 주세요.',
          code: 'INVALID_TEMPO'
        },
        { status: 400 }
      )
    }

    const tempoText = tempoField?.trim() ?? ''
    const tempo = tempoText ? Number(tempoText) : null
    if (tempo !== null && (!Number.isFinite(tempo) || tempo < 20 || tempo > 400)) {
      return NextResponse.json(
        {
          error: '빠르기는 20에서 400 사이의 숫자로 입력해 주세요.',
          code: 'INVALID_TEMPO'
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    // Resolve the service before writing anything. A missing configuration is
    // knowable here, and refusing now is what keeps an unconfigured deployment
    // from accumulating rows that no job will ever complete.
    let omrServiceUrl: string
    try {
      omrServiceUrl = getOmrServiceUrl()
    } catch (error) {
      if (!(error instanceof OmrServiceNotConfiguredError)) throw error

      console.error('OMR upload refused:', error.message)
      return NextResponse.json(
        {
          error: '악보 변환 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.',
          code: 'OMR_SERVICE_NOT_CONFIGURED'
        },
        { status: 503 }
      )
    }

    // Resolve the callback before creating a row for the same reason as the
    // service URL above: a malformed deployment URL is knowable now, while a
    // row created first would have no job and no trigger capable of moving it.
    let callbackUrl: string
    try {
      const callbackBaseUrl = process.env.NEXTAUTH_URL?.trim() || request.nextUrl.origin
      callbackUrl = new URL('/api/omr/finalize', callbackBaseUrl).toString()
    } catch (error) {
      console.error('OMR callback refused: public application URL is invalid', error)
      return NextResponse.json(
        {
          error: '완료 알림 주소가 설정되지 않았습니다. 관리자에게 문의해 주세요.',
          code: 'OMR_CALLBACK_NOT_CONFIGURED'
        },
        { status: 503 }
      )
    }

    // Create sheet music record in database with pending status
    const sheetMusic = await prisma.sheetMusic.create({
      data: {
        title,
        composer: composer || 'Unknown',
        userId: userId,
        categoryId: categoryId ? parseInt(categoryId) : null,
        isPublic,
        animationDataUrl: '', // Will be updated when OMR processing completes
        processingStatus: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Prepare form data for OMR service
    const omrFormData = new FormData()
    omrFormData.append('file', file)
    omrFormData.append('title', title)
    omrFormData.append('composer', composer || 'Unknown')
    if (tempo !== null) omrFormData.append('tempo', tempo.toString())
    omrFormData.append('user_id', userId)
    omrFormData.append('sheet_music_id', sheetMusic.id.toString())
    omrFormData.append('callback_url', callbackUrl)

    // Send to OMR service.
    //
    // A `fetch` rejection and a non-ok response are different failures and were
    // handled as one: only the second branch existed, so an unreachable host —
    // DNS, TCP or TLS — fell through to the outer `catch`, which returned a
    // generic 500 and left the row untouched.
    let omrResponse: Response
    try {
      omrResponse = await fetch(`${omrServiceUrl}/process`, {
        method: 'POST',
        body: omrFormData,
        headers: {
          // Don't set Content-Type header for FormData, let fetch set it with boundary
          ...omrAuthHeaders()
        },
        // Increase timeout for file upload
        signal: AbortSignal.timeout(60000) // 60 seconds
      })
    } catch (error) {
      await markFailed(sheetMusic.id)

      console.error('OMR service unreachable:', omrServiceUrl, error)

      return NextResponse.json(
        {
          error: '악보 변환 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
          code: 'OMR_SERVICE_UNAVAILABLE',
          sheetMusicId: sheetMusic.id,
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 503 }
      )
    }

    if (!omrResponse.ok) {
      await markFailed(sheetMusic.id)

      const errorText = await omrResponse.text()
      console.error('OMR service error:', omrResponse.status, errorText)

      return NextResponse.json(
        {
          error: '악보 변환을 시작하지 못했습니다.',
          code: 'OMR_SERVICE_ERROR',
          sheetMusicId: sheetMusic.id
        },
        { status: 502 }
      )
    }

    const omrResult = await omrResponse.json()

    // Update database with job ID
    await prisma.sheetMusic.update({
      where: { id: sheetMusic.id },
      data: {
        omrJobId: omrResult.job_id,
        provenance: 'omr',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      sheetMusicId: sheetMusic.id,
      jobId: omrResult.job_id,
      status: omrResult.status,
      message: 'OMR processing started. You can check the status or wait for completion.'
    })

  } catch (error) {
    console.error('OMR upload error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
