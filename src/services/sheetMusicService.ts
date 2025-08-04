import {
  SheetMusicListResponse,
  PublicSheetMusicListResponse,
  SheetMusicResponse,
  CreateSheetMusicRequest,
  UpdateSheetMusicRequest
} from '@/types/sheet-music'

export class SheetMusicService {
  private static baseUrl = '/api/sheet'

  // Get user's sheet music list
  static async getUserSheetMusic(params?: {
    categoryId?: number
    search?: string
    public?: boolean
  }): Promise<SheetMusicListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.categoryId) {
      searchParams.append('categoryId', params.categoryId.toString())
    }
    if (params?.search) {
      searchParams.append('search', params.search)
    }
    if (params?.public !== undefined) {
      searchParams.append('public', params.public.toString())
    }

    const url = `${this.baseUrl}?${searchParams.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Get public sheet music list
  static async getPublicSheetMusic(params?: {
    search?: string
    categoryId?: number
    limit?: number
    offset?: number
  }): Promise<PublicSheetMusicListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.search) {
      searchParams.append('search', params.search)
    }
    if (params?.categoryId) {
      searchParams.append('categoryId', params.categoryId.toString())
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString())
    }
    if (params?.offset) {
      searchParams.append('offset', params.offset.toString())
    }

    const url = `${this.baseUrl}/public?${searchParams.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Get specific sheet music by ID
  static async getSheetMusic(id: number): Promise<SheetMusicResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Create new sheet music
  static async createSheetMusic(data: CreateSheetMusicRequest): Promise<SheetMusicResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to create sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Update sheet music
  static async updateSheetMusic(id: number, data: UpdateSheetMusicRequest): Promise<SheetMusicResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to update sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Delete sheet music
  static async deleteSheetMusic(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to delete sheet music: ${response.statusText}`)
    }
    
    return response.json()
  }
}