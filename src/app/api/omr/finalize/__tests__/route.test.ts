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
const mockUpdate = prisma.sheetMusic.update as jest.Mock
const mockGetInstance = FileStorageService.getInstance as jest.Mock

const JOB_ID = 'job-callback'
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
      url: 'https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_job-callback.json',
    })
    mockGetInstance.mockReturnValue({ uploadOmrAnimationData })
    mockFindFirst.mockResolvedValue(row())
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
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { omrJobId: JOB_ID } })
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

  it('fails closed when the callback secret is not configured', async () => {
    delete process.env.OMR_SHARED_SECRET

    const { POST } = await import('../route')
    const response = await POST(callbackRequest())

    expect(response.status).toBe(503)
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('is idempotent after another trigger has stored the result', async () => {
    mockFindFirst.mockResolvedValue(
      row({
        animationDataUrl:
          'https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_job-callback.json',
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
    mockFindFirst.mockResolvedValue(row({ processingStatus: 'failed' }))

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
