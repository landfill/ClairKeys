/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { practiceSession: { groupBy: jest.fn() }, sheetMusic: { findMany: jest.fn() } } }))
const session = getServerSession as jest.Mock
const groupBy = prisma.practiceSession.groupBy as jest.Mock
const findMany = prisma.sheetMusic.findMany as jest.Mock
const group = (id = 1) => ({ sheetMusicId: id, _count: { _all: 3 }, _sum: { durationSeconds: 125 }, _max: { completedPercentage: 42, createdAt: new Date('2026-10-04T01:00:00Z') } })
beforeEach(() => { jest.clearAllMocks(); session.mockResolvedValue({ user: { id: 'reader' } }); groupBy.mockResolvedValue([group()]); findMany.mockResolvedValue([{ id: 1, title: '내 연습곡', composer: '작곡가' }]) })
const request = (query = '') => new NextRequest(`http://localhost/api/practice${query}`)
it('requires a session without touching the database', async () => {
  session.mockResolvedValue(null)
  const res = await GET(request())
  expect(res.status).toBe(401); expect(groupBy).not.toHaveBeenCalled()
})
it('aggregates only the reader and sheets they can still access, returning no-store', async () => {
  const res = await GET(request())
  expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'reader', sheetMusic: { OR: [{ isPublic: true }, { userId: 'reader' }] }, createdAt: { lte: expect.any(Date) } }, by: ['sheetMusicId'], take: 21 }))
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [1] }, OR: [{ isPublic: true }, { userId: 'reader' }] } }))
  expect(await res.json()).toEqual({ cursor: expect.any(String), nextCursor: null, items: [{ sheetId: 1, title: '내 연습곡', composer: '작곡가', count: 3, totalSeconds: 125, bestPercentage: 42, lastPracticedAt: '2026-10-04T01:00:00.000Z' }] })
})
it('drops a sheet whose access disappeared between grouping and title lookup', async () => {
  findMany.mockResolvedValue([])
  expect((await (await GET(request())).json()).items).toEqual([])
})
it('anchors subsequent pages to the same snapshot and aggregate date/id cursor without offsets', async () => {
  groupBy.mockResolvedValueOnce(Array.from({ length: 21 }, (_, i) => group(100 - i)))
  findMany.mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => ({ id: 100 - i, title: '곡', composer: '저자' })))
  const first = await (await GET(request())).json()
  expect(first.items).toHaveLength(20)
  const next = JSON.parse(Buffer.from(first.nextCursor, 'base64url').toString())
  const start = JSON.parse(Buffer.from(first.cursor, 'base64url').toString())
  expect(next.asOf).toBe(start.asOf)
  expect(next.after).toEqual({ at: '2026-10-04T01:00:00.000Z', sheetId: 81 })
  groupBy.mockResolvedValueOnce([])
  await GET(request(`?cursor=${first.nextCursor}`))
  const secondQuery = groupBy.mock.calls[1][0]
  expect(secondQuery).not.toHaveProperty('skip')
  expect(secondQuery.where.createdAt.lte).toEqual(new Date(start.asOf))
  expect(secondQuery.having).toEqual({ OR: [
    { createdAt: { _max: { lt: new Date(next.after.at) } } },
    { AND: [{ createdAt: { _max: { equals: new Date(next.after.at) } } }, { sheetMusicId: { lt: 81 } }] },
  ] })
  expect(secondQuery.orderBy).toEqual([{ _max: { createdAt: 'desc' } }, { sheetMusicId: 'desc' }])
  await GET(request(`?cursor=${first.cursor}`))
  expect(groupBy.mock.calls[2][0].where.createdAt.lte).toEqual(new Date(start.asOf))
  expect(groupBy.mock.calls[2][0].having).toBeUndefined()
})
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
it.each(['', 'abc', encode({ asOf: 'invalid' }), encode({ asOf: '2026-10-04T01:00:00.000Z', after: { at: '2026-10-04T02:00:00.000Z', sheetId: 1 } }), encode({ asOf: '2026-10-04T01:00:00.000Z', after: { at: '2026-10-04T00:00:00.000Z', sheetId: -1 } })])('rejects invalid cursor %s', async value => {
  expect((await GET(request(`?cursor=${value}`))).status).toBe(400)
  expect(groupBy).not.toHaveBeenCalled()
})
it('returns an empty page without querying titles', async () => {
  groupBy.mockResolvedValue([])
  expect(await (await GET(request())).json()).toEqual({ cursor: expect.any(String), nextCursor: null, items: [] })
  expect(findMany).not.toHaveBeenCalled()
})
it('contains database errors in an explicit failure response', async () => {
  groupBy.mockRejectedValue(new Error('database unavailable'))
  expect((await GET(request())).status).toBe(500)
})
