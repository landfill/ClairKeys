import { renderHook, act, waitFor } from '@testing-library/react'
import { useCategories, useCategory } from '../useCategories'
import { CategoryService } from '@/services/categoryService'
import { Category, CategoryWithSheetMusic } from '@/types/category'

// Mock the CategoryService
jest.mock('@/services/categoryService')
const mockCategoryService = CategoryService as jest.Mocked<typeof CategoryService>

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch categories on mount', async () => {
    const mockCategories: Category[] = [
      {
        id: 1,
        name: 'Classical',
        userId: 'user1',
        createdAt: new Date('2024-01-01'),
      },
    ]

    mockCategoryService.getCategories.mockResolvedValue(mockCategories)

    const { result } = renderHook(() => useCategories())

    expect(result.current.loading).toBe(true)
    expect(result.current.categories).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toEqual(mockCategories)
    expect(result.current.error).toBeNull()
    expect(mockCategoryService.getCategories).toHaveBeenCalledTimes(1)
  })

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch categories'
    mockCategoryService.getCategories.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.categories).toEqual([])
  })

  it('should create category successfully', async () => {
    const mockCategories: Category[] = []
    const newCategory: Category = {
      id: 1,
      name: 'Jazz',
      userId: 'user1',
      createdAt: new Date('2024-01-01'),
    }

    mockCategoryService.getCategories.mockResolvedValue(mockCategories)
    mockCategoryService.createCategory.mockResolvedValue(newCategory)

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const created = await result.current.createCategory({ name: 'Jazz' })
      expect(created).toEqual(newCategory)
    })

    expect(result.current.categories).toContain(newCategory)
    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({ name: 'Jazz' })
  })

  it('should handle create category error', async () => {
    const errorMessage = 'Category with this name already exists'
    mockCategoryService.getCategories.mockResolvedValue([])
    mockCategoryService.createCategory.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await expect(result.current.createCategory({ name: 'Jazz' })).rejects.toThrow(errorMessage)
    })

    expect(result.current.error).toBe(errorMessage)
  })

  it('should update category successfully', async () => {
    const originalCategory: Category = {
      id: 1,
      name: 'Classical',
      userId: 'user1',
      createdAt: new Date('2024-01-01'),
    }
    const updatedCategory: Category = {
      ...originalCategory,
      name: 'Classical Music',
    }

    mockCategoryService.getCategories.mockResolvedValue([originalCategory])
    mockCategoryService.updateCategory.mockResolvedValue(updatedCategory)

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const updated = await result.current.updateCategory(1, { name: 'Classical Music' })
      expect(updated).toEqual(updatedCategory)
    })

    expect(result.current.categories[0]).toEqual(updatedCategory)
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(1, { name: 'Classical Music' })
  })

  it('should delete category successfully', async () => {
    const category: Category = {
      id: 1,
      name: 'Classical',
      userId: 'user1',
      createdAt: new Date('2024-01-01'),
    }

    mockCategoryService.getCategories.mockResolvedValue([category])
    mockCategoryService.deleteCategory.mockResolvedValue()

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toContain(category)

    await act(async () => {
      await result.current.deleteCategory(1)
    })

    expect(result.current.categories).not.toContain(category)
    expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(1)
  })
})

describe('useCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch category with sheet music on mount', async () => {
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

    mockCategoryService.getCategory.mockResolvedValue(mockCategory)

    const { result } = renderHook(() => useCategory(1))

    expect(result.current.loading).toBe(true)
    expect(result.current.category).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.category).toEqual(mockCategory)
    expect(result.current.error).toBeNull()
    expect(mockCategoryService.getCategory).toHaveBeenCalledWith(1)
  })

  it('should handle fetch error', async () => {
    const errorMessage = 'Category not found'
    mockCategoryService.getCategory.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useCategory(999))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.category).toBeNull()
  })
})