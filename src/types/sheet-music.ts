import type { SheetMusicProvenance } from '@prisma/client'
import type { SheetMusicAvailability } from '@/lib/sheetMusicAvailability'

export interface SheetMusic {
  id: number
  title: string
  composer: string
  userId: string
  categoryId: number | null
  isPublic: boolean
  animationDataUrl: string
  /** API-derived status for client display; persistence code must not supply it. */
  availability?: SheetMusicAvailability
  provenance: SheetMusicProvenance
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
  userId?: string;
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
  /** New quarter-note BPM; omitted leaves the stored timing untouched. */
  tempo?: number
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
  userId?: string;
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
