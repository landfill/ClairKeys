/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sheetMusic: { findMany: jest.fn(), count: jest.fn() },
    category: { findMany: jest.fn() },
  },
}))

describe('GET /api/sheet/search public provenance boundary', () => {
  it('excludes demo sheets from logged-in public results and aggregates', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } })
    ;(prisma.sheetMusic.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.sheetMusic.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET(new NextRequest('http://localhost:3000/api/sheet/search'))
    expect(response.status).toBe(200)

    const findManyArgs = (prisma.sheetMusic.findMany as jest.Mock).mock.calls[0][0]
    expect(findManyArgs.where.OR[0]).toEqual({ isPublic: true, provenance: { not: 'demo' } })
    const publicCountArgs = (prisma.sheetMusic.count as jest.Mock).mock.calls
      .find(([args]) => args.where.isPublic === true)
    expect(publicCountArgs?.[0].where.provenance).toEqual({ not: 'demo' })
    const categoryArgs = (prisma.category.findMany as jest.Mock).mock.calls[0][0]
    expect(categoryArgs.include._count.select.sheetMusic.where.OR[0]).toEqual({
      isPublic: true,
      provenance: { not: 'demo' },
    })
  })
})
