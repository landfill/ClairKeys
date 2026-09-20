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
describe('private score endpoint', () => {
  beforeEach(() => { jest.clearAllMocks(); session.mockResolvedValue({ user: { id: 'owner' } }) })
  it('rejects anonymous callers before database access', async () => {
    session.mockResolvedValue(null)
    expect((await get()).status).toBe(401)
    expect(find).not.toHaveBeenCalled()
  })
  it('scopes lookup to owner even for public sheets', async () => {
    find.mockResolvedValue(null)
    expect((await get()).status).toBe(404)
    expect(find).toHaveBeenCalledWith({ where: { sheetMusicId: 1, sheetMusic: { userId: 'owner' } }, select: { data: true } })
  })
  it('returns owner artifact with private no-store caching', async () => {
    find.mockResolvedValue({ data: { version: 1, musicxml: '<score-partwise/>' } })
    const result = await get()
    expect(result.status).toBe(200)
    expect(result.headers.get('Cache-Control')).toBe('private, no-store')
    expect((await result.json()).musicxml).toBe('<score-partwise/>')
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
