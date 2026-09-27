/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sheetMusic: { findUnique: jest.fn() },
    practiceSession: { create: jest.fn(), aggregate: jest.fn() },
  },
}))

const session = getServerSession as jest.MockedFunction<typeof getServerSession>
const db = prisma as unknown as {
  sheetMusic: { findUnique: jest.Mock }
  practiceSession: { create: jest.Mock; aggregate: jest.Mock }
}
const params = (id = '7') => ({ params: Promise.resolve({ id }) })
const post = (body: unknown) =>
  new NextRequest('http://localhost:3000/api/sheet/7/practice', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  jest.clearAllMocks()
  session.mockResolvedValue({ user: { id: 'reader' } } as never)
  db.sheetMusic.findUnique.mockResolvedValue({ id: 7, userId: 'owner', isPublic: true })
  db.practiceSession.create.mockResolvedValue({ id: 1 })
})

describe('POST /api/sheet/[id]/practice', () => {
  it('records a practice run on a sheet the reader may play', async () => {
    const response = await POST(post({ durationSeconds: 95.6, completedPercentage: 42.25 }), params())
    expect(response.status).toBe(201)
    expect(db.practiceSession.create).toHaveBeenCalledWith({
      data: { userId: 'reader', sheetMusicId: 7, durationSeconds: 96, completedPercentage: 42.25 },
      select: { id: true },
    })
  })

  it('requires a signed-in reader', async () => {
    session.mockResolvedValue(null)
    expect((await POST(post({ durationSeconds: 30, completedPercentage: 10 }), params())).status).toBe(401)
    expect(db.practiceSession.create).not.toHaveBeenCalled()
  })

  it('refuses a private sheet of someone else as if it did not exist', async () => {
    db.sheetMusic.findUnique.mockResolvedValue({ id: 7, userId: 'owner', isPublic: false })
    expect((await POST(post({ durationSeconds: 30, completedPercentage: 10 }), params())).status).toBe(404)
    db.sheetMusic.findUnique.mockResolvedValue(null)
    expect((await POST(post({ durationSeconds: 30, completedPercentage: 10 }), params())).status).toBe(404)
    expect(db.practiceSession.create).not.toHaveBeenCalled()
  })

  it('rejects values a real run cannot produce', async () => {
    for (const body of [
      { durationSeconds: 0, completedPercentage: 10 },
      { durationSeconds: 6 * 3600 + 1, completedPercentage: 10 },
      { durationSeconds: 30, completedPercentage: -1 },
      { durationSeconds: 30, completedPercentage: 100.5 },
      { durationSeconds: '30', completedPercentage: 10 },
      { durationSeconds: 30 },
      null,
    ]) {
      expect((await POST(post(body), params())).status).toBe(400)
    }
    expect((await POST(post({ durationSeconds: 30, completedPercentage: 10 }), params('abc'))).status).toBe(400)
    expect(db.practiceSession.create).not.toHaveBeenCalled()
  })
})

describe('GET /api/sheet/[id]/practice', () => {
  it('summarises only the signed-in reader’s own runs', async () => {
    db.practiceSession.aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _sum: { durationSeconds: 720 },
      _max: { completedPercentage: 85, createdAt: new Date('2026-09-27T01:00:00Z') },
    })
    const response = await GET(new NextRequest('http://localhost:3000/api/sheet/7/practice'), params())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toEqual({
      count: 3, totalSeconds: 720, bestPercentage: 85, lastPracticedAt: '2026-09-27T01:00:00.000Z',
    })
    expect(db.practiceSession.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'reader', sheetMusicId: 7 },
    }))
  })

  it('reports an empty history plainly', async () => {
    db.practiceSession.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { durationSeconds: null }, _max: { completedPercentage: null, createdAt: null } })
    const data = await (await GET(new NextRequest('http://localhost:3000/api/sheet/7/practice'), params())).json()
    expect(data).toEqual({ count: 0, totalSeconds: 0, bestPercentage: null, lastPracticedAt: null })
  })

  it('requires a signed-in reader', async () => {
    session.mockResolvedValue(null)
    expect((await GET(new NextRequest('http://localhost:3000/api/sheet/7/practice'), params())).status).toBe(401)
  })

  it('hides the history of a sheet the reader can no longer play', async () => {
    // Practised while public, then made private by its owner.
    db.sheetMusic.findUnique.mockResolvedValue({ id: 7, userId: 'owner', isPublic: false })
    expect((await GET(new NextRequest('http://localhost:3000/api/sheet/7/practice'), params())).status).toBe(404)
    expect(db.practiceSession.aggregate).not.toHaveBeenCalled()
  })
})

describe('POST racing a deletion', () => {
  it('answers 404, not 500, when the sheet disappears before the insert lands', async () => {
    db.practiceSession.create.mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }))
    expect((await POST(post({ durationSeconds: 30, completedPercentage: 10 }), params())).status).toBe(404)
  })
})
