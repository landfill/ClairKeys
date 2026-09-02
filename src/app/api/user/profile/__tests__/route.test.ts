/**
 * @jest-environment node
 */
import { GET } from '../route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>
const mockDb = prisma as jest.Mocked<typeof prisma>

describe('/api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refuses anonymous callers', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
  })

  it('reads only the caller own row', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never)
    ;(mockDb.user.findUnique as jest.Mock).mockResolvedValue({
      createdAt: new Date('2026-03-12T04:05:06.000Z')
    })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      createdAt: '2026-03-12T04:05:06.000Z'
    })
    // There is no id parameter, so the session is the only thing that can
    // select a row. Asserting it keeps a future refactor from adding one.
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { createdAt: true }
    })
  })

  it('returns 404 rather than a made-up date when the row is gone', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never)
    ;(mockDb.user.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(404)
  })

  it('fails with a generic message instead of leaking the database error', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never)
    ;(mockDb.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.0.4:5432')
    )
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to load profile'
    })
    consoleError.mockRestore()
  })
})
