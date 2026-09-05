/** @jest-environment node */
import { NextRequest } from 'next/server'
import { PUT } from '../route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { saveSheetTempo } from '@/services/sheetTempoService'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({ prisma: { sheetMusic: { findUnique: jest.fn(), update: jest.fn() } } }))
jest.mock('@/services/sheetTempoService')

const source = {
  id: 1, userId: 'owner', title: 'score', composer: 'composer', isPublic: false,
  animationDataUrl: 'https://score.supabase.co/storage/v1/object/public/animation-data/owner/score.json',
  updatedAt: new Date('2026-09-05T00:00:00Z'), categoryId: null, category: null,
  createdAt: new Date('2026-09-05T00:00:00Z'), processingStatus: 'completed', omrJobId: null,
  provenance: 'omr' as const,
}
const request = (body: unknown) => PUT(new NextRequest('http://localhost/api/sheet/1', {
  method: 'PUT', body: JSON.stringify(body),
}), { params: Promise.resolve({ id: '1' }) })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getServerSession).mockResolvedValue({ user: { id: 'owner' } })
  jest.mocked(prisma.sheetMusic.findUnique).mockResolvedValue(source as Awaited<ReturnType<typeof prisma.sheetMusic.findUnique>>)
  jest.mocked(saveSheetTempo).mockResolvedValue({ ...source, animationDataUrl: 'new-url' } as Awaited<ReturnType<typeof saveSheetTempo>>)
})

it('routes owner edits through time rescaling and returns the new animation URL', async () => {
  const response = await request({ title: 'renamed', tempo: 69 })
  expect(response.status).toBe(200)
  expect(saveSheetTempo).toHaveBeenCalledWith({
    id: 1, userId: 'owner', animationDataUrl: source.animationDataUrl, updatedAt: source.updatedAt,
  }, 69, { title: 'renamed' })
  expect((await response.json()).sheetMusic.animationDataUrl).toBe('new-url')
  expect(prisma.sheetMusic.update).not.toHaveBeenCalled()
})

it.each([0, 401, null, '69'])('rejects invalid tempo %s before any storage change', async tempo => {
  expect((await request({ tempo })).status).toBe(400)
  expect(saveSheetTempo).not.toHaveBeenCalled()
})

it('does not let a non-owner rewrite public animation data', async () => {
  jest.mocked(getServerSession).mockResolvedValue({ user: { id: 'visitor' } })
  expect((await request({ tempo: 69 })).status).toBe(403)
  expect(saveSheetTempo).not.toHaveBeenCalled()
})

it('requires authentication', async () => {
  jest.mocked(getServerSession).mockResolvedValue(null)
  expect((await request({ tempo: 69 })).status).toBe(401)
  expect(saveSheetTempo).not.toHaveBeenCalled()
})

it('rejects unfinished scores', async () => {
  jest.mocked(prisma.sheetMusic.findUnique).mockResolvedValue({ ...source, animationDataUrl: '' } as Awaited<ReturnType<typeof prisma.sheetMusic.findUnique>>)
  expect((await request({ tempo: 69 })).status).toBe(409)
  expect(saveSheetTempo).not.toHaveBeenCalled()
})
