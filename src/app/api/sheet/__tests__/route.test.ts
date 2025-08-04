/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/db', () => ({
  db: {
    sheetMusic: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    category: {
      findFirst: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return unauthorized when no session', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheet')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user sheet music list', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockSheetMusic = [
        {
          id: 1,
          title: 'Test Song',
          composer: 'Test Composer',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 1, name: 'Classical' }
        }
      ]
      mockDb.sheetMusic.findMany.mockResolvedValue(mockSheetMusic as any)

      const request = new NextRequest('http://localhost:3000/api/sheet')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sheetMusic).toHaveLength(1)
      expect(data.sheetMusic[0].title).toBe('Test Song')
    })

    it('should filter by category', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockDb.sheetMusic.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/sheet?categoryId=1')
      await GET(request)

      expect(mockDb.sheetMusic.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          categoryId: 1
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    })

    it('should filter by search term', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockDb.sheetMusic.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/sheet?search=beethoven')
      await GET(request)

      expect(mockDb.sheetMusic.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          OR: [
            { title: { contains: 'beethoven', mode: 'insensitive' } },
            { composer: { contains: 'beethoven', mode: 'insensitive' } }
          ]
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    })
  })

  describe('POST', () => {
    it('should return unauthorized when no session', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheet', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Song',
          composer: 'Test Composer',
          animationDataUrl: 'http://example.com/data.json'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required fields', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/sheet', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          composer: 'Test Composer',
          animationDataUrl: 'http://example.com/data.json'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('should create sheet music successfully', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockCreatedSheet = {
        id: 1,
        title: 'Test Song',
        composer: 'Test Composer',
        userId: 'user1',
        categoryId: null,
        isPublic: false,
        animationDataUrl: 'http://example.com/data.json',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null
      }
      mockDb.sheetMusic.create.mockResolvedValue(mockCreatedSheet as any)

      const request = new NextRequest('http://localhost:3000/api/sheet', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Song',
          composer: 'Test Composer',
          animationDataUrl: 'http://example.com/data.json'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.sheetMusic.title).toBe('Test Song')
    })

    it('should validate category exists', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockDb.category.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheet', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Song',
          composer: 'Test Composer',
          categoryId: 999,
          animationDataUrl: 'http://example.com/data.json'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Category not found or access denied')
    })
  })
})