import { CategoryService } from '../categoryService'
import { Category, CategoryWithSheetMusic } from '@/types/category'

// Mock fetch globally
global.fetch = jest.fn()

describe('CategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Classical',
          userId: 'user1',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          name: 'Pop',
          userId: 'user1',
          createdAt: new Date('2024-01-02'),
        },
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories,
      })

      const result = await CategoryService.getCategories()

      expect(fetch).toHaveBeenCalledWith('/api/categories')
      expect(result).toEqual(mockCategories)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      })

      await expect(CategoryService.getCategories()).rejects.toThrow(
        'Failed to fetch categories: Internal Server Error'
      )
    })
  })

  describe('getCategory', () => {
    it('should fetch category with sheet music successfully', async () => {
      const mockCategory: CategoryWithSheetMusic = {
        id: 1,
        name: 'Classical',
        userId: 'user1',
        createdAt: new Date('2024-01-01'),
        sheetMusic: [
          {
            id: 1,
            title: 'Für Elise',
            composer: 'Beethoven',
            isPublic: true,
            createdAt: new Date('2024-01-01'),
          },
        ],
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategory,
      })

      const result = await CategoryService.getCategory(1)

      expect(fetch).toHaveBeenCalledWith('/api/categories/1')
      expect(result).toEqual(mockCategory)
    })

    it('should throw error when category not found', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(CategoryService.getCategory(999)).rejects.toThrow(
        'Failed to fetch category: Not Found'
      )
    })
  })

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const newCategory: Category = {
        id: 3,
        name: 'Jazz',
        userId: 'user1',
        createdAt: new Date('2024-01-03'),
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      })

      const result = await CategoryService.createCategory({ name: 'Jazz' })

      expect(fetch).toHaveBeenCalledWith('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Jazz' }),
      })
      expect(result).toEqual(newCategory)
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Category with this name already exists' }),
      })

      await expect(CategoryService.createCategory({ name: 'Jazz' })).rejects.toThrow(
        'Category with this name already exists'
      )
    })
  })

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const updatedCategory: Category = {
        id: 1,
        name: 'Classical Music',
        userId: 'user1',
        createdAt: new Date('2024-01-01'),
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCategory,
      })

      const result = await CategoryService.updateCategory(1, { name: 'Classical Music' })

      expect(fetch).toHaveBeenCalledWith('/api/categories/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Classical Music' }),
      })
      expect(result).toEqual(updatedCategory)
    })

    it('should throw error when update fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Category not found' }),
      })

      await expect(CategoryService.updateCategory(999, { name: 'New Name' })).rejects.toThrow(
        'Category not found'
      )
    })
  })

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await expect(CategoryService.deleteCategory(1)).resolves.toBeUndefined()

      expect(fetch).toHaveBeenCalledWith('/api/categories/1', {
        method: 'DELETE',
      })
    })

    it('should throw error when deletion fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Category not found' }),
      })

      await expect(CategoryService.deleteCategory(999)).rejects.toThrow(
        'Category not found'
      )
    })
  })
})