/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { FileStorageService } from '@/services/fileStorageService'

/**
 * D-011 — the OMR service holds no storage credentials.
 *
 * It converts a PDF and hands the animation JSON back through
 * `GET /result/{job_id}`; this route stores it with
 * `SUPABASE_SERVICE_ROLE_KEY`, which only the Next.js side holds. Two probes on
 * 2026-08-21 forced that split: `SUPABASE_ANON_KEY` is rejected by Storage RLS
 * with 403, so the service could never have stored anything, and giving it the
 * service-role key instead would put an unrestricted credential on a public-IP
 * VM.
 *
 * The tests below pin the three properties that are easy to get wrong once the
 * store moves here:
 *
 *   - storing happens once even though this route is polled in a loop;
 *   - a failure to store fails the row rather than leaving it `processing`
 *     against a service that will drop the payload;
 *   - the user's title survives. The old code copied `result.title` over it,
 *     and before PR #38 that value was the PDF's filename.
 */

jest.mock('next-auth')
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
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

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockFindFirst = prisma.sheetMusic.findFirst as jest.Mock
const mockUpdate = prisma.sheetMusic.update as jest.Mock
const mockGetInstance = FileStorageService.getInstance as jest.Mock

const JOB_ID = 'job-abc'
const ROW_ID = 7
const USER_TITLE = '사용자가 입력한 제목'

const ANIMATION = { version: '1.0', notes: [{ midi: 60, start: 0, duration: 1, velocity: 0.8 }] }

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ROW_ID,
    title: USER_TITLE,
    composer: 'J.S. Bach',
    userId: 'user-1',
    categoryId: null,
    isPublic: false,
    animationDataUrl: '',
    processingStatus: 'processing',
    omrJobId: JOB_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function statusRequest(): NextRequest {
  return new NextRequest(`http://localhost:3000/api/omr/status/${JOB_ID}`)
}

const params = Promise.resolve({ jobId: JOB_ID })

/** Import the route fresh so it reads the current environment. */
async function loadRoute() {
  let route: typeof import('../route')
  await jest.isolateModulesAsync(async () => {
    route = await import('../route')
  })
  return route!
}

describe('GET /api/omr/status/[jobId] — the D-011 store', () => {
  const originalUrl = process.env.OMR_SERVICE_URL
  const originalSecret = process.env.OMR_SHARED_SECRET
  let fetchSpy: jest.SpyInstance
  let uploadOmrAnimationData: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    process.env.OMR_SHARED_SECRET = 'shared-secret'

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    } as never)
    mockUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...storedRow(),
      ...data,
      category: null,
    }))

    uploadOmrAnimationData = jest.fn().mockResolvedValue({
      success: true,
      url: 'https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_job-abc.json',
      path: 'user-1/omr_job-abc.json',
    })
    mockGetInstance.mockReturnValue({ uploadOmrAnimationData })

    fetchSpy = jest.spyOn(global, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    if (originalUrl === undefined) delete process.env.OMR_SERVICE_URL
    else process.env.OMR_SERVICE_URL = originalUrl
    if (originalSecret === undefined) delete process.env.OMR_SHARED_SECRET
    else process.env.OMR_SHARED_SECRET = originalSecret
  })

  /** `/status` then `/result`, in that order. */
  function respondCompleted() {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/status/')) {
        return new Response(
          JSON.stringify({
            status: 'completed',
            progress: 100,
            message: 'Processing completed successfully',
            result: {
              // No animation_data_url: the service stores nothing under D-011.
              title: 'input.pdf',
              composer: 'Unknown',
              processed_at: new Date().toISOString(),
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ job_id: JOB_ID, animation_data: ANIMATION }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })
  }

  it('collects the result and stores it with the server-side key', async () => {
    mockFindFirst.mockResolvedValue(storedRow())
    respondCompleted()

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(uploadOmrAnimationData).toHaveBeenCalledWith(JOB_ID, 'user-1', ANIMATION)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ROW_ID },
        data: expect.objectContaining({
          processingStatus: 'completed',
          animationDataUrl: expect.stringContaining('/animation-data/'),
        }),
      })
    )
    expect(data.sheetMusic.animationDataUrl).toContain('/animation-data/')
  })

  it('sends the shared secret to both service endpoints', async () => {
    mockFindFirst.mockResolvedValue(storedRow())
    respondCompleted()

    const { GET } = await loadRoute()
    await GET(statusRequest(), { params })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    for (const call of fetchSpy.mock.calls) {
      const init = call[1] as RequestInit
      expect((init.headers as Record<string, string>)['X-ClairKeys-Token']).toBe('shared-secret')
    }
  })

  it('stores once when a second poll arrives after the first stored it', async () => {
    // Polling is a loop; the second poll sees a row that already has its URL.
    mockFindFirst.mockResolvedValue(
      storedRow({
        animationDataUrl:
          'https://project.supabase.co/storage/v1/object/public/animation-data/user-1/omr_job-abc.json',
      })
    )
    respondCompleted()

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })

    expect(response.status).toBe(200)
    // No second upload, and no second trip to /result for a payload already held.
    expect(uploadOmrAnimationData).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('never overwrites the title the user typed', async () => {
    mockFindFirst.mockResolvedValue(storedRow())
    respondCompleted()

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })
    const data = await response.json()

    const [{ data: updatePayload }] = mockUpdate.mock.calls[0]
      ? [mockUpdate.mock.calls[0][0]]
      : [{ data: {} }]

    expect(updatePayload).not.toHaveProperty('title')
    expect(updatePayload).not.toHaveProperty('composer')
    expect(data.sheetMusic.title).toBe(USER_TITLE)
  })

  it('fails the row when the result cannot be stored', async () => {
    mockFindFirst.mockResolvedValue(storedRow())
    respondCompleted()
    uploadOmrAnimationData.mockResolvedValue({ success: false, error: 'bucket unavailable' })

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.code).toBe('ANIMATION_STORAGE_FAILED')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ROW_ID },
        data: expect.objectContaining({ processingStatus: 'failed' }),
      })
    )
  })

  it('does not store anything while the job is still running', async () => {
    mockFindFirst.mockResolvedValue(storedRow())
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'processing', progress: 30, message: 'Processing PDF' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })

    expect(response.status).toBe(200)
    expect(uploadOmrAnimationData).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
