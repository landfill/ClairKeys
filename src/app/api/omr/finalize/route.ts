import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  fetchAndStoreOmrResult,
  OmrFinalizationError,
} from '@/lib/omr/finalizeJob'

export const maxDuration = 60

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function callbackIsAuthorized(request: NextRequest): 'authorized' | 'missing-config' | 'unauthorized' {
  const expected = process.env.OMR_SHARED_SECRET?.trim()
  if (!expected) return 'missing-config'

  const received = request.headers.get('X-ClairKeys-Token') ?? ''
  const expectedBytes = Buffer.from(expected)
  const receivedBytes = Buffer.from(received)

  if (expectedBytes.length !== receivedBytes.length) return 'unauthorized'
  return timingSafeEqual(expectedBytes, receivedBytes) ? 'authorized' : 'unauthorized'
}

/**
 * Server-owned completion trigger for issue 55.
 *
 * The OMR service calls this after conversion. It carries no storage
 * credential; this route collects `/result` and performs the D-011 write. The
 * browser status route remains a fallback, but navigating away no longer
 * removes the only trigger that can persist the score.
 */
export async function POST(request: NextRequest) {
  const authorization = callbackIsAuthorized(request)
  if (authorization === 'missing-config') {
    return NextResponse.json(
      { error: 'OMR callback authentication is not configured.' },
      { status: 503 }
    )
  }
  if (authorization === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 })
  }

  const jobId =
    typeof body === 'object' && body !== null && typeof (body as { job_id?: unknown }).job_id === 'string'
      ? (body as { job_id: string }).job_id.trim()
      : ''

  if (!jobId || !UUID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: 'A valid job_id UUID is required.' }, { status: 400 })
  }

  const sheetMusic = await prisma.sheetMusic.findUnique({
    where: { omrJobId: jobId },
  })

  if (!sheetMusic) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  }

  const storedJobId = sheetMusic.omrJobId
  if (!storedJobId) {
    return NextResponse.json({ error: 'Stored job identifier is missing.' }, { status: 409 })
  }

  if (sheetMusic.animationDataUrl) {
    return NextResponse.json({
      success: true,
      jobId,
      sheetMusicId: sheetMusic.id,
      status: 'completed',
      animationDataUrl: sheetMusic.animationDataUrl,
      alreadyStored: true,
    })
  }

  try {
    // Use the identifier read back from the database, not request input, for
    // the server-side fetch target. The request value is only a lookup key.
    const animationDataUrl = await fetchAndStoreOmrResult(storedJobId, sheetMusic.userId)
    await prisma.sheetMusic.update({
      where: { id: sheetMusic.id },
      data: {
        animationDataUrl,
        processingStatus: 'completed',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      jobId,
      sheetMusicId: sheetMusic.id,
      status: 'completed',
      animationDataUrl,
      alreadyStored: false,
    })
  } catch (error) {
    if (error instanceof OmrFinalizationError) {
      if (error.code === 'ANIMATION_STORAGE_FAILED') {
        await prisma.sheetMusic.update({
          where: { id: sheetMusic.id },
          data: { processingStatus: 'failed', updatedAt: new Date() },
        })
      }
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    console.error('OMR callback finalization failed:', jobId, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
