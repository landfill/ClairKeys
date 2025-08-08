import { useState, useEffect } from 'react'
import { Category, CategoryWithSheetMusic, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'
import { CategoryService } from '@/services/categoryService'
import { useCachedFetch } from '@/hooks/useCache'

export function useCategories() {
  // Use cached fetch for categories
  const {
    data: categories,
    loading,
    error,
    refresh: fetchCategories,
    invalidate
  } = useCachedFetch<Category[]>(
    'user_categories',
    () => CategoryService.getCategories(),
    {
      ttl: 60 * 1000, // 1 minute cache
      storage: 'memory',
      staleWhileRevalidate: true
    }
  )

  const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
    try {
      const newCategory = await CategoryService.createCategory(data)
      // Invalidate cache to refresh data
      await invalidate()
      return newCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      throw new Error(errorMessage)
    }
  }

  const updateCategory = async (id: number, data: UpdateCategoryRequest): Promise<Category> => {
    try {
      const updatedCategory = await CategoryService.updateCategory(id, data)
      // Invalidate cache to refresh data
      await invalidate()
      return updatedCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      throw new Error(errorMessage)
    }
  }

  const deleteCategory = async (id: number): Promise<void> => {
    try {
      await CategoryService.deleteCategory(id)
      // Invalidate cache to refresh data
      await invalidate()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      throw new Error(errorMessage)
    }
  }

  return {
    categories: categories || [],
    loading,
    error: error ? error.message : null,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}

export function useCategory(id: number) {
  const [category, setCategory] = useState<CategoryWithSheetMusic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CategoryService.getCategory(id)
      setCategory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch category')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchCategory()
    }
  }, [id])

  return {
    category,
    loading,
    error,
    fetchCategory,
  }
}