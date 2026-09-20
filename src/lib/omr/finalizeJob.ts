import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { isScoreArtifact, MAX_SCORE_ARTIFACT_BYTES } from '@/types/scoreArtifact'
import { FileStorageService } from '@/services/fileStorageService'
import { getOmrServiceUrl, omrAuthHeaders } from '@/lib/omr/serviceUrl'

export class OmrFinalizationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'OmrFinalizationError'
  }
}

/**
 * Collect a completed conversion and store it with the credential that remains
 * on the Next.js side under D-011.
 *
 * Both the browser status poll and the OMR service callback use this boundary.
 * The storage path is job-derived and upserted, so concurrent triggers write
 * the same bytes to the same object rather than orphaning one of two objects.
 */
export async function fetchAndStoreOmrResult(
  jobId: string,
  userId: string
): Promise<string> {
  let resultResponse: Response
  try {
    const resultUrl = `${getOmrServiceUrl()}/result/${encodeURIComponent(jobId)}`
    resultResponse = await fetch(resultUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...omrAuthHeaders(),
      },
      signal: AbortSignal.timeout(30000),
    })
  } catch (error) {
    console.error('OMR result fetch failed:', jobId, error)
    throw new OmrFinalizationError(
      '변환 결과를 가져오지 못했습니다.',
      'OMR_RESULT_UNAVAILABLE',
      503
    )
  }

  if (!resultResponse.ok) {
    console.error('OMR result error:', resultResponse.status, await resultResponse.text())
    throw new OmrFinalizationError(
      '변환 결과를 가져오지 못했습니다.',
      'OMR_RESULT_ERROR',
      502
    )
  }

  const resultPayload = await resultResponse.json()
  if (resultPayload.score_artifact !== undefined) {
    const artifact: unknown = resultPayload.score_artifact
    if (!isScoreArtifact(artifact) || Buffer.byteLength(JSON.stringify(artifact), 'utf8') > MAX_SCORE_ARTIFACT_BYTES) {
      throw new OmrFinalizationError('악보 표시 데이터가 올바르지 않습니다.', 'INVALID_SCORE_ARTIFACT', 502)
    }
    try {
      // Nested upsert is FK-bound to the owner/job row. A deleted sheet cannot
      // recreate an orphan artifact, including during concurrent callbacks.
      const data = artifact as unknown as Prisma.InputJsonValue
      await prisma.sheetMusic.update({
        where: { omrJobId: jobId, userId },
        data: { scoreArtifact: { upsert: { create: { data }, update: { data } } } },
      })
    } catch {
      throw new OmrFinalizationError('악보 표시 데이터를 저장하지 못했습니다.', 'SCORE_STORAGE_FAILED', 502)
    }
  }
  const stored = await FileStorageService.getInstance().uploadOmrAnimationData(
    jobId,
    userId,
    resultPayload.animation_data
  )

  if (!stored.success || !stored.url) {
    console.error('OMR result storage failed:', jobId, stored.error)
    throw new OmrFinalizationError(
      '변환 결과를 저장하지 못했습니다.',
      'ANIMATION_STORAGE_FAILED',
      502
    )
  }

  return stored.url
}
