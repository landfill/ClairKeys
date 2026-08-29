/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sheetMusic: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const mockFindMany = prisma.sheetMusic.findMany as jest.Mock
const mockCount = prisma.sheetMusic.count as jest.Mock

describe('GET /api/sheet/public provenance filter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  it('excludes only confirmed demo rows from both the page and total', async () => {
    const response = await GET(new NextRequest('http://localhost/api/sheet/public'))

    expect(response.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isPublic: true,
          provenance: { not: 'demo' },
        },
      })
    )
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        isPublic: true,
        provenance: { not: 'demo' },
      },
    })
  })
})
