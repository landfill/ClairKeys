import { Category, CategoryWithSheetMusic, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'

export class CategoryService {
  private static baseUrl = '/api/categories'

  static async getCategories(): Promise<Category[]> {
    const response = await fetch(this.baseUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }
    
    return response.json()
  }

  static async getCategory(id: number): Promise<CategoryWithSheetMusic> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`)
    }
    
    return response.json()
  }

  static async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to create category: ${response.statusText}`)
    }
    
    return response.json()
  }

  static async updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to update category: ${response.statusText}`)
    }
    
    return response.json()
  }

  static async deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to delete category: ${response.statusText}`)
    }
  }
}