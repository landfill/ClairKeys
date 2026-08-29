/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

/**
 * A job the OMR service no longer has.
 *
 * This route finds its row by `omrJobId`, so a row that is never moved off
 * `processing` can never be moved again — the stranded row this PR exists to
 * remove. The upload route reached that state by creating a row before a
 * `fetch` that threw; this file covers the other door into it.
 *
 * The service holds job state in memory. A restart drops every in-flight job,
 * after which `/status/{job_id}` answers **404** — verified against the live
 * service on the VM on 2026-08-23. The route previously treated that like any
 * other non-ok status: log, return 502, write nothing. Every later poll then
 * took the identical path to the identical 502, and the row sat at `processing`
 * for good.
 *
 * The distinction that matters is between two things a failed status check can
 * mean:
 *
 *   - "I cannot reach the service" — transient. An operator fixes it and the
 *     same job resumes, so the stored status must survive untouched. That is
 *     the `catch` branch, and it is already right.
 *   - "the service answered, and this job is gone" — permanent. Only a 404
 *     means this, and only this may fail the row.
 *
 * 5xx, 401, and 503 all belong to the first group: the service is failing, the
 * shared secret does not match yet, or it is not set at all. Failing a user's
 * row because an operator has not finished configuring the host would destroy
 * work that is still perfectly recoverable.
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

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockFindFirst = prisma.sheetMusic.findFirst as jest.Mock
const mockUpdate = prisma.sheetMusic.update as jest.Mock

const JOB_ID = 'job-lost'
const ROW_ID = 11
const USER_TITLE = '사용자가 입력한 제목'

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

/** Answer the service's `/status` call with one status code and body. */
function respondWith(status: number, body = '') {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response(body, { status }) as never)
}

describe('GET /api/omr/status/[jobId] — a job the service no longer has', () => {
  const originalUrl = process.env.OMR_SERVICE_URL
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    } as never)
    mockFindFirst.mockResolvedValue(storedRow())
    mockUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...storedRow(),
      ...data,
      category: null,
    }))
  })

  afterEach(() => {
    fetchSpy?.mockRestore()
    if (originalUrl === undefined) delete process.env.OMR_SERVICE_URL
    else process.env.OMR_SERVICE_URL = originalUrl
  })

  it('fails the row when the service answers 404 for the job', async () => {
    fetchSpy = respondWith(404, JSON.stringify({ detail: 'Job not found' }))

    const { GET } = await loadRoute()
    await GET(statusRequest(), { params })

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ROW_ID },
        data: expect.objectContaining({ processingStatus: 'failed' }),
      })
    )
  })

  it('tells the poller the job ended, so it stops rather than throwing', async () => {
    // The client throws on any non-ok response and reports a generic error.
    // Answering 200 with `status: "failed"` puts it on the same path it takes
    // when the service itself reports a failure, which carries a real message.
    fetchSpy = respondWith(404, JSON.stringify({ detail: 'Job not found' }))

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('failed')
    expect(body.sheetMusic.processingStatus).toBe('failed')
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
  })

  it('names the failure so the screen can tell it from a score it could not read', async () => {
    // The upload screen shows a different recovery action for each of the four
    // user-facing failures (D-026 G1-5): a lost job means "upload it again",
    // an unreadable score means "try a sharper PDF". Without a code the only
    // thing separating them in this payload is a Korean sentence, and matching
    // on prose across the network boundary is a contract nothing enforces.
    fetchSpy = respondWith(404, JSON.stringify({ detail: 'Job not found' }))

    const { GET } = await loadRoute()
    const body = await (await GET(statusRequest(), { params })).json()

    expect(body.code).toBe('OMR_JOB_LOST')
  })

  it('leaves the user title alone while failing the row', async () => {
    fetchSpy = respondWith(404, JSON.stringify({ detail: 'Job not found' }))

    const { GET } = await loadRoute()
    await GET(statusRequest(), { params })

    const [{ data }] = mockUpdate.mock.calls[0]
    expect(data).not.toHaveProperty('title')
    expect(data).not.toHaveProperty('composer')
  })

  it.each([
    ['a service-side failure', 500],
    ['an unset shared secret', 503],
    ['a secret that does not match', 401],
  ])('leaves the row untouched on %s', async (_label, status) => {
    fetchSpy = respondWith(status, 'nope')

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })

    expect(response.status).toBe(502)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('leaves the row untouched when the service cannot be reached at all', async () => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'))

    const { GET } = await loadRoute()
    const response = await GET(statusRequest(), { params })

    expect(response.status).toBe(503)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
