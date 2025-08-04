export interface Category {
  id: number
  name: string
  userId: string
  createdAt: Date
}

export interface CategoryWithSheetMusic extends Category {
  sheetMusic: {
    id: number
    title: string
    composer: string
    isPublic: boolean
    createdAt: Date
  }[]
}

export interface CreateCategoryRequest {
  name: string
}

export interface UpdateCategoryRequest {
  name: string
}

export interface CategoryListResponse {
  success: boolean
  categories: Category[]
}

export interface CategoryResponse {
  success: boolean
  category: CategoryWithSheetMusic
}