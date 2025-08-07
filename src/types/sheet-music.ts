export interface SheetMusic {
  id: number
  title: string
  composer: string
  userId: string
  categoryId: number | null
  isPublic: boolean
  animationDataUrl: string
  createdAt: Date
  updatedAt: Date
}

export interface SheetMusicWithCategory extends SheetMusic {
  category: {
    id: number
    name: string
  } | null
}

export interface SheetMusicWithOwner extends SheetMusicWithCategory {
  owner: {
    id: string
    name: string | null
  } | null
}

export interface CreateSheetMusicRequest {
  title: string
  composer: string
  categoryId?: number
  isPublic?: boolean
  animationDataUrl: string
}

export interface UpdateSheetMusicRequest {
  title?: string
  composer?: string
  categoryId?: number | null
  isPublic?: boolean
}

export interface SheetMusicListResponse {
  success: boolean
  sheetMusic: SheetMusicWithCategory[]
}

export interface PublicSheetMusicListResponse {
  success: boolean
  sheetMusic: SheetMusicWithOwner[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface SheetMusicResponse {
  success: boolean
  sheetMusic: SheetMusicWithCategory & {
    owner?: {
      id: string
      name: string | null
      email: string
    } | null
  }
}

export interface SearchSheetMusicParams {
  search?: string
  categoryId?: number
  isPublic?: boolean
  limit?: number
  offset?: number
  sortBy?: 'newest' | 'oldest' | 'title' | 'composer'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchSheetMusicResponse {
  success: boolean
  sheetMusic: SheetMusicWithOwner[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  filters?: {
    categories: Array<{
      id: number
      name: string
      count: number
    }>
    totalPublic: number
    totalPrivate: number
  }
}