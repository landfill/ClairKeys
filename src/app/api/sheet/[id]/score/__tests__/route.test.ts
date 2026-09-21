/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'
jest.mock('next-auth')
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { sheetScoreArtifact: { findFirst: jest.fn() } } }))
const session = getServerSession as jest.Mock
const find = prisma.sheetScoreArtifact.findFirst as jest.Mock
const get = (id = '1') => GET(new NextRequest(`http://localhost/api/sheet/${id}/score`), { params: Promise.resolve({ id }) })
const artifact = { data: { version: 1, musicxml: '<score-partwise/>' } }

// In-memory stand-in for the database: evaluates the route's where clause against
// real sheet rows, so the permission rule itself is exercised, not a mocked shape.
type Row = { sheetMusicId: number; isPublic: boolean; userId: string }
type Filter = { isPublic?: boolean; userId?: string }
const matches = (row: Row, filter: Filter) =>
  (filter.isPublic === undefined || row.isPublic === filter.isPublic) &&
  (filter.userId === undefined || row.userId === filter.userId)
function seed(rows: Row[]) {
  find.mockImplementation(async ({ where }) => {
    const row = rows.find(r => r.sheetMusicId === where.sheetMusicId)
    if (!row) return null
    const sheet = where.sheetMusic ?? {}
    const allowed = sheet.OR ? sheet.OR.some((f: Filter) => matches(row, f)) : matches(row, sheet)
    return allowed ? artifact : null
  })
}

describe('score endpoint follows sheet playback permission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    session.mockResolvedValue({ user: { id: 'owner' } })
    seed([
      { sheetMusicId: 1, isPublic: true, userId: 'owner' },
      { sheetMusicId: 2, isPublic: false, userId: 'owner' },
    ])
  })

  it('returns a public sheet score to an anonymous visitor', async () => {
    session.mockResolvedValue(null)
    const result = await get('1')
    expect(result.status).toBe(200)
    expect((await result.json()).musicxml).toBe('<score-partwise/>')
  })
  it('returns a public sheet score to a signed-in non-owner', async () => {
    session.mockResolvedValue({ user: { id: 'visitor' } })
    expect((await get('1')).status).toBe(200)
  })
  it('returns a private sheet score to its owner', async () => {
    expect((await get('2')).status).toBe(200)
  })
  it.each([
    ['an anonymous visitor', null],
    ['a signed-in non-owner', { user: { id: 'visitor' } }],
  ])('hides a private sheet score from %s as not found', async (_label, value) => {
    session.mockResolvedValue(value)
    const result = await get('2')
    expect(result.status).toBe(404)
    expect(await result.json()).toEqual({ error: 'Score not found' })
  })
  it('reports a missing sheet the same way as a private one', async () => {
    session.mockResolvedValue(null)
    expect((await get('3')).status).toBe(404)
  })
  it('keeps private no-store caching even for public scores', async () => {
    session.mockResolvedValue(null)
    expect((await get('1')).headers.get('Cache-Control')).toBe('private, no-store')
  })
  it.each(['1abc', '-1', '0', '1.5'])('rejects invalid id %s', async id => {
    expect((await get(id)).status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })
  it('refuses an oversized retained row before returning its payload through the function', async () => {
    find.mockResolvedValue({ data: { version: 1, musicxml: 'x'.repeat(5 * 1024 * 1024) } })
    const response = await get()
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'Score exceeds the display size limit' })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
  it('does not expose database errors', async () => {
    find.mockRejectedValue(new Error('private database detail'))
    const result = await get()
    expect(result.status).toBe(500)
    expect(await result.text()).not.toContain('private database detail')
  })
})
