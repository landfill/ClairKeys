/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/db', () => ({
  db: {
    sheetMusic: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    category: {
      findFirst: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/sheet/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return sheet music for owner', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockSheetMusic = {
        id: 1,
        title: 'Test Song',
        composer: 'Test Composer',
        userId: 'user1',
        isPublic: false,
        animationDataUrl: 'http://example.com/data.json',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
        category: { id: 1, name: 'Classical' }
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockSheetMusic as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sheetMusic.title).toBe('Test Song')
      expect(data.sheetMusic.owner).toBeTruthy()
    })

    it('should return public sheet music for non-owner', async () => {
      const mockSession = {
        user: { id: 'user2', email: 'test2@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockSheetMusic = {
        id: 1,
        title: 'Test Song',
        composer: 'Test Composer',
        userId: 'user1',
        isPublic: true,
        animationDataUrl: 'http://example.com/data.json',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
        category: { id: 1, name: 'Classical' }
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockSheetMusic as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sheetMusic.owner).toBeNull()
    })

    it('should deny access to private sheet music', async () => {
      const mockSession = {
        user: { id: 'user2', email: 'test2@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockSheetMusic = {
        id: 1,
        userId: 'user1',
        isPublic: false
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockSheetMusic as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return 404 for non-existent sheet music', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockDb.sheetMusic.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheet/999')
      const response = await GET(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Sheet music not found')
    })
  })

  describe('PUT', () => {
    it('should update sheet music successfully', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockExistingSheet = {
        id: 1,
        userId: 'user1'
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockExistingSheet as any)

      const mockUpdatedSheet = {
        id: 1,
        title: 'Updated Song',
        composer: 'Updated Composer',
        categoryId: null,
        isPublic: true,
        updatedAt: new Date(),
        category: null
      }
      mockDb.sheetMusic.update.mockResolvedValue(mockUpdatedSheet as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Song',
          composer: 'Updated Composer',
          isPublic: true
        })
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sheetMusic.title).toBe('Updated Song')
    })

    it('should validate required fields', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1', {
        method: 'PUT',
        body: JSON.stringify({
          title: '',
          composer: 'Test Composer'
        })
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('should deny access to non-owner', async () => {
      const mockSession = {
        user: { id: 'user2', email: 'test2@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockExistingSheet = {
        id: 1,
        userId: 'user1'
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockExistingSheet as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Song',
          composer: 'Updated Composer'
        })
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('DELETE', () => {
    it('should delete sheet music successfully', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockExistingSheet = {
        id: 1,
        userId: 'user1'
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockExistingSheet as any)
      mockDb.sheetMusic.delete.mockResolvedValue(mockExistingSheet as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Sheet music deleted successfully')
    })

    it('should deny access to non-owner', async () => {
      const mockSession = {
        user: { id: 'user2', email: 'test2@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const mockExistingSheet = {
        id: 1,
        userId: 'user1'
      }
      mockDb.sheetMusic.findUnique.mockResolvedValue(mockExistingSheet as any)

      const request = new NextRequest('http://localhost:3000/api/sheet/1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })
})