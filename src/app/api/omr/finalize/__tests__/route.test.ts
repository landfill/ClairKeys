/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FileStorageService } from '@/services/fileStorageService'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sheetMusic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('@/services/fileStorageService', () => ({
  FileStorageService: {
    getInstance: jest.fn(),
  },
}))

const mockFindFirst = prisma.sheetMusic.findFirst as jest.Mock
const mockFindUnique = prisma.sheetMusic.findUnique as jest.Mock
const mockUpdate = prisma.sheetMusic.update as jest.Mock
const mockGetInstance = FileStorageService.getInstance as jest.Mock

const JOB_ID = '123e4567-e89b-42d3-a456-426614174000'
const ANIMATION = {
  version: '1.0',
  notes: [{ midi: 60, start: 0, duration: 1, velocity: 0.8 }],
}

function callbackRequest(token = 'shared-secret'): NextRequest {
  return new NextRequest('http://localhost:3000/api/omr/finalize', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-ClairKeys-Token': token,
    },
    body: JSON.stringify({ job_id: JOB_ID }),
  })
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 17,
    userId: 'user-1',
    animationDataUrl: '',
    processingStatus: 'processing',
    omrJobId: JOB_ID,
    ...overrides,
  }
}

describe('POST /api/omr/finalize — server-owned completion trigger', () => {
  const originalUrl = process.env.OMR_SERVICE_URL
  const originalSecret = process.env.OMR_SHARED_SECRET
  let fetchSpy: jest.SpyInstance
  let uploadOmrAnimationData: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    process.env.OMR_SHARED_SECRET = 'shared-secret'
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ job_id: JOB_ID, animation_data: ANIMATION }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    uploadOmrAnimationData = jest.fn().mockResolvedValue({
      success: true,
      url: `https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_${JOB_ID}.json`,
    })
    mockGetInstance.mockReturnValue({ uploadOmrAnimationData })
    mockFindFirst.mockResolvedValue(row())
    mockFindUnique.mockResolvedValue(row())
    mockUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...row(),
      ...data,
    }))
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    if (originalUrl === undefined) delete process.env.OMR_SERVICE_URL
    else process.env.OMR_SERVICE_URL = originalUrl
    if (originalSecret === undefined) delete process.env.OMR_SHARED_SECRET
    else process.env.OMR_SHARED_SECRET = originalSecret
  })

  it('collects and stores a completed result without a user session', async () => {
    const { POST } = await import('../route')
    const response = await POST(callbackRequest())

    expect(response.status).toBe(200)
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { omrJobId: JOB_ID } })
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(uploadOmrAnimationData).toHaveBeenCalledWith(JOB_ID, 'user-1', ANIMATION)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 17 },
      data: expect.objectContaining({
        processingStatus: 'completed',
        animationDataUrl: expect.stringContaining('/animation-data/'),
      }),
    })
  })

  it('rejects a caller that does not know the service secret', async () => {
    const { POST } = await import('../route')
    const response = await POST(callbackRequest('wrong-secret'))

    expect(response.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a job identifier outside the service UUID contract', async () => {
    const request = new NextRequest('http://localhost:3000/api/omr/finalize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-ClairKeys-Token': 'shared-secret',
      },
      body: JSON.stringify({ job_id: '../status/other-job' }),
    })

    const { POST } = await import('../route')
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails closed when the callback secret is not configured', async () => {
    delete process.env.OMR_SHARED_SECRET

    const { POST } = await import('../route')
    const response = await POST(callbackRequest())

    expect(response.status).toBe(503)
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('is idempotent after another trigger has stored the result', async () => {
    mockFindUnique.mockResolvedValue(
      row({
        animationDataUrl:
          `https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_${JOB_ID}.json`,
        processingStatus: 'completed',
      })
    )

    const { POST } = await import('../route')
    const response = await POST(callbackRequest())

    expect(response.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(uploadOmrAnimationData).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('retries a row previously marked failed when storage becomes available', async () => {
    mockFindUnique.mockResolvedValue(row({ processingStatus: 'failed' }))

    const { POST } = await import('../route')
    const response = await POST(callbackRequest())

    expect(response.status).toBe(200)
    expect(uploadOmrAnimationData).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processingStatus: 'completed' }),
      })
    )
  })
})
