import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getOmrServiceUrl, omrAuthHeaders, OmrServiceNotConfiguredError } from '@/lib/omr/serviceUrl'
import { FileStorageService } from '@/services/fileStorageService'

/**
 * The completing poll does more than poll: it fetches the score from the OMR
 * service and uploads it to Storage inside this one invocation. Vercel's
 * default function duration is shorter than the `/result` timeout below, so
 * without this the store could be killed mid-flight — and because the row keeps
 * its empty `animationDataUrl`, the next poll would retry and be killed again.
 * 60s is the Hobby-plan ceiling.
 */
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Find the sheet music record with this job ID
    const sheetMusic = await prisma.sheetMusic.findFirst({
      where: {
        omrJobId: jobId,
        userId: userId // Ensure user can only check their own jobs
      }
    })

    if (!sheetMusic) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      )
    }

    // Get status from OMR service. As in the upload route, an unreachable or
    // unconfigured service must not read as an application error — the poll
    // simply has no answer yet, and the stored status stays as it is.
    let statusResponse: Response
    try {
      statusResponse = await fetch(`${getOmrServiceUrl()}/status/${jobId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...omrAuthHeaders()
        },
        // Short timeout for status checks
        signal: AbortSignal.timeout(10000) // 10 seconds
      })
    } catch (error) {
      const notConfigured = error instanceof OmrServiceNotConfiguredError
      console.error('OMR service status unreachable:', error)

      return NextResponse.json(
        {
          error: notConfigured
            ? '악보 변환 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.'
            : '악보 변환 서비스에 연결할 수 없습니다.',
          code: notConfigured ? 'OMR_SERVICE_NOT_CONFIGURED' : 'OMR_SERVICE_UNAVAILABLE'
        },
        { status: 503 }
      )
    }

    if (!statusResponse.ok) {
      console.error('OMR service status error:', statusResponse.status, await statusResponse.text())

      // A 404 is the service answering that this job is gone — not a service
      // that cannot answer. It holds job state in memory, so a restart drops
      // every in-flight job at once. Rows are found here by `omrJobId`, so
      // leaving one at `processing` strands it: every later poll takes this
      // same path, and nothing ever moves it again. That is the failure this
      // PR removes on the upload side, reached through a different door.
      //
      // Every other non-ok status is transient by comparison — 5xx is the
      // service failing, 401/403 a shared secret that does not match yet, 503
      // one that is not set at all. An operator fixes those and the same job
      // resumes, so the stored status has to survive them untouched.
      if (statusResponse.status === 404) {
        const lostJobRow = await prisma.sheetMusic.update({
          where: { id: sheetMusic.id },
          data: {
            processingStatus: 'failed',
            updatedAt: new Date()
          },
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })

        // Answering 200 with `status: 'failed'` rather than an error status is
        // deliberate: the poller throws on any non-ok response and reports a
        // generic "failed to check status". This puts it on the same path it
        // already takes when the service itself reports a failed job, which
        // carries a message the user can act on.
        return NextResponse.json({
          success: true,
          jobId,
          sheetMusicId: sheetMusic.id,
          status: 'failed',
          progress: 0,
          message: '변환 작업을 찾을 수 없습니다.',
          error: '변환 서비스가 재시작되어 진행 중이던 작업이 사라졌습니다. 다시 업로드해 주세요.',
          sheetMusic: {
            id: lostJobRow.id,
            title: lostJobRow.title,
            composer: lostJobRow.composer,
            categoryId: lostJobRow.categoryId,
            category: lostJobRow.category,
            isPublic: lostJobRow.isPublic,
            animationDataUrl: lostJobRow.animationDataUrl,
            processingStatus: lostJobRow.processingStatus,
            createdAt: lostJobRow.createdAt,
            updatedAt: lostJobRow.updatedAt
          }
        })
      }

      return NextResponse.json(
        { error: '처리 상태를 가져오지 못했습니다.', code: 'OMR_SERVICE_ERROR' },
        { status: 502 }
      )
    }

    const omrStatus = await statusResponse.json()

    // Update database based on OMR status
    const updateData: Prisma.SheetMusicUpdateInput = {
      updatedAt: new Date()
    }

    if (omrStatus.status === 'completed' && omrStatus.result) {
      // D-011: the service stores nothing. Collect the animation JSON and write
      // it here with SUPABASE_SERVICE_ROLE_KEY, which only this side holds.
      //
      // The title and composer are no longer copied back from the service.
      // Overwriting what the user typed with a value the service echoed has no
      // upside, and before PR #38 that echo was the PDF's filename — the second
      // link in the concealment chain recorded on 2026-08-21.
      if (sheetMusic.animationDataUrl) {
        // Already stored by an earlier poll. Polling is a loop, so arriving here
        // twice is normal, not an error.
        updateData.processingStatus = 'completed'
      } else {
        let resultResponse: Response
        try {
          resultResponse = await fetch(`${getOmrServiceUrl()}/result/${jobId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...omrAuthHeaders()
            },
            // The payload is a whole score, so this is not a status-poll timeout.
            signal: AbortSignal.timeout(30000)
          })
        } catch (error) {
          console.error('OMR result fetch failed:', jobId, error)
          return NextResponse.json(
            {
              error: '변환 결과를 가져오지 못했습니다.',
              code: 'OMR_RESULT_UNAVAILABLE'
            },
            { status: 503 }
          )
        }

        if (!resultResponse.ok) {
          console.error('OMR result error:', resultResponse.status, await resultResponse.text())
          return NextResponse.json(
            { error: '변환 결과를 가져오지 못했습니다.', code: 'OMR_RESULT_ERROR' },
            { status: 502 }
          )
        }

        const resultPayload = await resultResponse.json()

        const stored = await FileStorageService.getInstance().uploadOmrAnimationData(
          jobId,
          userId,
          resultPayload.animation_data
        )

        if (!stored.success || !stored.url) {
          // Storage is the last step, and a job whose result cannot be stored has
          // produced nothing a client can play. Fail it rather than leave it
          // 'processing' forever against a service that will drop the payload.
          await prisma.sheetMusic.update({
            where: { id: sheetMusic.id },
            data: { processingStatus: 'failed', updatedAt: new Date() }
          })

          console.error('OMR result storage failed:', jobId, stored.error)

          return NextResponse.json(
            { error: '변환 결과를 저장하지 못했습니다.', code: 'ANIMATION_STORAGE_FAILED' },
            { status: 502 }
          )
        }

        updateData.animationDataUrl = stored.url
        updateData.processingStatus = 'completed'
      }
    } else if (omrStatus.status === 'failed') {
      // OMR processing failed
      updateData.processingStatus = 'failed'
    } else {
      // Still processing
      updateData.processingStatus = 'processing'
    }

    // Update database
    const updatedSheetMusic = await prisma.sheetMusic.update({
      where: { id: sheetMusic.id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Return combined status
    return NextResponse.json({
      success: true,
      jobId,
      sheetMusicId: sheetMusic.id,
      status: omrStatus.status,
      progress: omrStatus.progress || 0,
      message: omrStatus.message || 'Processing...',
      sheetMusic: {
        id: updatedSheetMusic.id,
        title: updatedSheetMusic.title,
        composer: updatedSheetMusic.composer,
        categoryId: updatedSheetMusic.categoryId,
        category: updatedSheetMusic.category,
        isPublic: updatedSheetMusic.isPublic,
        animationDataUrl: updatedSheetMusic.animationDataUrl,
        processingStatus: updatedSheetMusic.processingStatus,
        createdAt: updatedSheetMusic.createdAt,
        updatedAt: updatedSheetMusic.updatedAt
      },
      // Include raw OMR status for debugging
      omrDetails: process.env.NODE_ENV === 'development' ? omrStatus : undefined
    })

  } catch (error) {
    console.error('OMR status check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}