/** @jest-environment node */
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { cacheService } from '@/lib/cache'
import { GET } from '../route'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: { category: { findMany: jest.fn() } }
}))
jest.mock('@/lib/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}))

describe('GET /api/categories timing surface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('reports a cache hit without a database query', async () => {
    ;(cacheService.get as jest.Mock).mockResolvedValue([{ id: 1, name: '클래식' }])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Cache')).toBe('HIT')
    expect(response.headers.get('X-Database-Queries')).toBe('0')
    expect(response.headers.get('Server-Timing')).toContain('cache;dur=')
    expect(prisma.category.findMany).not.toHaveBeenCalled()
  })

  it('reports one database query on a cache miss', async () => {
    ;(cacheService.get as jest.Mock).mockResolvedValue(null)
    ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Cache')).toBe('MISS')
    expect(response.headers.get('X-Database-Queries')).toBe('1')
    expect(response.headers.get('Server-Timing')).toContain('db;dur=')
  })
})
