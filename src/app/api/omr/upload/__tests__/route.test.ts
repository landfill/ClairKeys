/**
 * @jest-environment node
 */
import { File } from 'node:buffer'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

/**
 * Regression evidence for the 2026-08-23 production report: a PDF upload
 * created a `SheetMusic` row, returned `Internal server error`, and stored
 * nothing.
 *
 * The cause is not in this route — the OMR service has never been deployed and
 * `OMR_SERVICE_URL` still names the dead `clairkeys-omr.fly.dev`, so the
 * `fetch` throws at TLS rather than returning a non-ok response. D-010 accepted
 * that upload fails visibly until issue #22 lands, so these tests do NOT assert
 * that upload succeeds.
 *
 * What they assert is that the failure is *honest and clean*:
 *
 *   - a transport failure marks the row `failed`; before this change the
 *     `catch` block returned 500 and left the row `processing` forever with no
 *     `omrJobId`, which `/api/omr/status/[jobId]` can never reach either.
 *   - an unconfigured service is refused before any row is created, instead of
 *     surfacing a TLS handshake error from a hostname nobody owns any more.
 */

jest.mock('next-auth')
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sheetMusic: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCreate = prisma.sheetMusic.create as jest.Mock
const mockUpdate = prisma.sheetMusic.update as jest.Mock

const CREATED_ROW_ID = 42

/**
 * `jest.setup.js` replaces `global.File` with a plain class that is not a
 * `Blob`, so `FormData.append` would stringify it and the route would see no
 * filename. Node's own `File` is used here instead; the global mock stays put
 * because the rest of the suite relies on it.
 */
function uploadRequest(tempo?: string): NextRequest {
  const body = new FormData()
  body.append(
    'file',
    new File([new Uint8Array([1, 2, 3])], 'score.pdf', { type: 'application/pdf' }) as unknown as Blob
  )
  body.append('title', 'WTK1 Prelude 1')
  body.append('composer', 'J.S. Bach')
  if (tempo !== undefined) body.append('tempo', tempo)

  return new NextRequest(
    new Request('http://localhost:3000/api/omr/upload', { method: 'POST', body })
  )
}

/** Import the route fresh so it reads the current `OMR_SERVICE_URL`. */
async function loadRoute() {
  let route: typeof import('../route')
  await jest.isolateModulesAsync(async () => {
    route = await import('../route')
  })
  return route!
}

describe('POST /api/omr/upload — failure is visible, not silent', () => {
  const originalUrl = process.env.OMR_SERVICE_URL
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    } as never)
    mockCreate.mockResolvedValue({ id: CREATED_ROW_ID } as never)
    mockUpdate.mockResolvedValue({ id: CREATED_ROW_ID } as never)
    fetchSpy = jest.spyOn(global, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    if (originalUrl === undefined) delete process.env.OMR_SERVICE_URL
    else process.env.OMR_SERVICE_URL = originalUrl
  })

  it('marks the row failed when the OMR service is unreachable', async () => {
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    // What a dead host actually produces: a thrown transport error, not a
    // non-ok response. This is the branch the production 500 came from.
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'))

    const { POST } = await loadRoute()
    const response = await POST(uploadRequest())
    const data = await response.json()

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CREATED_ROW_ID },
        data: expect.objectContaining({ processingStatus: 'failed' }),
      })
    )
    expect(response.status).toBe(503)
    expect(data.code).toBe('OMR_SERVICE_UNAVAILABLE')
    expect(data.sheetMusicId).toBe(CREATED_ROW_ID)
  })

  it('refuses before creating a row when OMR_SERVICE_URL is unset', async () => {
    delete process.env.OMR_SERVICE_URL

    const { POST } = await loadRoute()
    const response = await POST(uploadRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.code).toBe('OMR_SERVICE_NOT_CONFIGURED')
    // No row, no orphan: the config gap is known before any write happens.
    expect(mockCreate).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('marks the row failed when the service answers with an error status', async () => {
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    fetchSpy.mockResolvedValue(new Response('boom', { status: 502 }))

    const { POST } = await loadRoute()
    const response = await POST(uploadRequest())

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processingStatus: 'failed' }),
      })
    )
    expect(response.status).toBe(502)
  })

  it.each(['19', '401', '0', 'not-a-number'])('rejects invalid tempo %s before creating a row', async (tempo) => {
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ job_id: 'job-1', status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { POST } = await loadRoute()
    const response = await POST(uploadRequest(tempo))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: '빠르기는 20에서 400 사이의 숫자로 입력해 주세요.',
      code: 'INVALID_TEMPO',
    })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('forwards a valid optional tempo to the OMR service', async () => {
    process.env.OMR_SERVICE_URL = 'https://omr.example.invalid'
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ job_id: 'job-1', status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { POST } = await loadRoute()
    const response = await POST(uploadRequest('72'))

    expect(response.status).toBe(200)
    const [, requestInit] = fetchSpy.mock.calls[0]
    expect((requestInit?.body as FormData).get('tempo')).toBe('72')
  })
})
