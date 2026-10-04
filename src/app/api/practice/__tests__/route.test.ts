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
  expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'reader', sheetMusic: { OR: [{ isPublic: true }, { userId: 'reader' }] } }, by: ['sheetMusicId'], take: 21, skip: 0 }))
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [1] }, OR: [{ isPublic: true }, { userId: 'reader' }] } }))
  expect(await res.json()).toEqual({ page: 1, hasMore: false, items: [{ sheetId: 1, title: '내 연습곡', composer: '작곡가', count: 3, totalSeconds: 125, bestPercentage: 42, lastPracticedAt: '2026-10-04T01:00:00.000Z' }] })
})
it('drops a sheet whose access disappeared between grouping and title lookup', async () => {
  findMany.mockResolvedValue([])
  expect((await (await GET(request())).json()).items).toEqual([])
})
it('paginates deterministically without exposing the look-ahead item', async () => {
  groupBy.mockResolvedValue(Array.from({ length: 21 }, (_, i) => group(i + 1)))
  findMany.mockResolvedValue(Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: '곡', composer: '저자' })))
  const data = await (await GET(request('?page=2'))).json()
  expect(data.items).toHaveLength(20); expect(data.hasMore).toBe(true); expect(data.page).toBe(2)
  expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 21, orderBy: [{ _max: { createdAt: 'desc' } }, { sheetMusicId: 'desc' }] }))
})
it.each(['0', '-1', '1.5', 'abc', '10001'])('rejects invalid page %s', async value => {
  expect((await GET(request(`?page=${value}`))).status).toBe(400)
  expect(groupBy).not.toHaveBeenCalled()
})
it('returns an empty page without querying titles', async () => {
  groupBy.mockResolvedValue([])
  expect(await (await GET(request())).json()).toEqual({ page: 1, hasMore: false, items: [] })
  expect(findMany).not.toHaveBeenCalled()
})
it('contains database errors in an explicit failure response', async () => {
  groupBy.mockRejectedValue(new Error('database unavailable'))
  expect((await GET(request())).status).toBe(500)
})
