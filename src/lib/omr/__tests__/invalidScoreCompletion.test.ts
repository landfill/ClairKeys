/** @jest-environment node */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/omr/finalize/route'
import { GET } from '@/app/api/omr/status/[jobId]/route'
import { MAX_SCORE_ARTIFACT_BYTES } from '@/types/scoreArtifact'

jest.mock('next-auth', () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { id: 'owner' } }) }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { sheetMusic: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() } } }))
jest.mock('@/services/fileStorageService', () => ({ FileStorageService: { getInstance: jest.fn(() => { throw new Error('Invalid results must never upload') }) } }))

const jobId = '123e4567-e89b-42d3-a456-426614174000'
const row = { id: 125, userId: 'owner', omrJobId: jobId, animationDataUrl: '', processingStatus: 'processing' }
const update = prisma.sheetMusic.update as jest.Mock
const oversized = {
  version: 1, timingReferenceBpm: 60,
  // The XML alone is below the producer cap; mappings push the complete envelope over it.
  musicxml: `<score-partwise>${' '.repeat(MAX_SCORE_ARTIFACT_BYTES - 100)}</score-partwise>`,
  measures: [], notes: Array.from({ length: 20 }, (_, i) => ({ xmlId: `n${i}`, noteIndex: 0 })),
}
const originalSecret = process.env.OMR_SHARED_SECRET
const originalUrl = process.env.OMR_SERVICE_URL
let fetchSpy: jest.SpyInstance
beforeEach(() => {
  jest.clearAllMocks()
  process.env.OMR_SHARED_SECRET = 'local-test-secret'
  process.env.OMR_SERVICE_URL = 'http://omr.invalid'
  ;(prisma.sheetMusic.findUnique as jest.Mock).mockResolvedValue(row)
  ;(prisma.sheetMusic.findFirst as jest.Mock).mockResolvedValue(row)
  update.mockResolvedValue({ ...row, processingStatus: 'failed' })
  fetchSpy = jest.spyOn(global, 'fetch')
})
afterEach(() => {
  fetchSpy.mockRestore()
  if (originalSecret === undefined) delete process.env.OMR_SHARED_SECRET
  else process.env.OMR_SHARED_SECRET = originalSecret
  if (originalUrl === undefined) delete process.env.OMR_SERVICE_URL
  else process.env.OMR_SERVICE_URL = originalUrl
})
it.each([['malformed', {}], ['oversized envelope', oversized]])('callback terminally fails %s artifacts and stops producer retries', async (_name, artifact) => {
  fetchSpy.mockResolvedValue(new Response(JSON.stringify({ animation_data: { notes: [] }, score_artifact: artifact })))
  const response = await POST(new NextRequest('http://localhost/api/omr/finalize', {
    method: 'POST', headers: { 'X-ClairKeys-Token': 'local-test-secret' }, body: JSON.stringify({ job_id: jobId }),
  }))
  expect(response.status).toBe(422)
  expect(await response.json()).toMatchObject({ code: 'INVALID_SCORE_ARTIFACT' })
  expect(update).toHaveBeenCalledWith({ where: { id: 125 }, data: { processingStatus: 'failed', updatedAt: expect.any(Date) } })
})
it.each([['malformed', {}], ['oversized envelope', oversized]])('poll settles the UI instead of retrying %s artifacts forever', async (_name, artifact) => {
  fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', result: {} })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ animation_data: { notes: [] }, score_artifact: artifact })))
  const response = await GET(new NextRequest(`http://localhost/api/omr/status/${jobId}`), { params: Promise.resolve({ jobId }) })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ success: true, status: 'failed', code: 'INVALID_SCORE_ARTIFACT', sheetMusicId: 125 })
  expect(update).toHaveBeenCalledWith({ where: { id: 125 }, data: { processingStatus: 'failed', updatedAt: expect.any(Date) } })
})
