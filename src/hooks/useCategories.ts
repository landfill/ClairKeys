import { useState, useEffect } from 'react'
import { Category, CategoryWithSheetMusic, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'
import { CategoryService } from '@/services/categoryService'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await CategoryService.getCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
    try {
      setError(null)
      const newCategory = await CategoryService.createCategory(data)
      setCategories(prev => [...prev, newCategory])
      return newCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateCategory = async (id: number, data: UpdateCategoryRequest): Promise<Category> => {
    try {
      setError(null)
      const updatedCategory = await CategoryService.updateCategory(id, data)
      setCategories(prev => 
        prev.map(cat => cat.id === id ? updatedCategory : cat)
      )
      return updatedCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteCategory = async (id: number): Promise<void> => {
    try {
      setError(null)
      await CategoryService.deleteCategory(id)
      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return {
    categories,
    loading,
    error,
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