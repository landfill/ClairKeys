import { useState, useEffect, useCallback } from 'react'
import { SheetMusicService } from '@/services/sheetMusicService'
import {
  SheetMusicWithCategory,
  SheetMusicWithOwner,
  CreateSheetMusicRequest,
  UpdateSheetMusicRequest
} from '@/types/sheet-music'

export function useSheetMusic() {
  const [sheetMusic, setSheetMusic] = useState<SheetMusicWithCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserSheetMusic = useCallback(async (params?: {
    categoryId?: number
    search?: string
    public?: boolean
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await SheetMusicService.getUserSheetMusic(params)
      setSheetMusic(response.sheetMusic)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sheet music')
    } finally {
      setLoading(false)
    }
  }, [])

  const createSheetMusic = async (data: CreateSheetMusicRequest) => {
    try {
      setError(null)
      const response = await SheetMusicService.createSheetMusic(data)
      setSheetMusic(prev => [response.sheetMusic, ...prev])
      return response.sheetMusic
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sheet music'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateSheetMusic = async (id: number, data: UpdateSheetMusicRequest) => {
    try {
      setError(null)
      const response = await SheetMusicService.updateSheetMusic(id, data)
      
      // Update the sheet music in the local state
      setSheetMusic(prev => 
        prev.map(sheet => 
          sheet.id === id ? { ...sheet, ...response.sheetMusic } : sheet
        )
      )
      
      return response.sheetMusic
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sheet music'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteSheetMusic = async (id: number) => {
    try {
      setError(null)
      await SheetMusicService.deleteSheetMusic(id)
      setSheetMusic(prev => prev.filter(sheet => sheet.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sheet music'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    sheetMusic,
    loading,
    error,
    fetchUserSheetMusic,
    createSheetMusic,
    updateSheetMusic,
    deleteSheetMusic
  }
}

export function usePublicSheetMusic() {
  const [sheetMusic, setSheetMusic] = useState<SheetMusicWithOwner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  })

  const fetchPublicSheetMusic = async (params?: {
    search?: string
    categoryId?: number
    limit?: number
    offset?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await SheetMusicService.getPublicSheetMusic(params)
      
      if (params?.offset === 0 || !params?.offset) {
        setSheetMusic(response.sheetMusic)
      } else {
        setSheetMusic(prev => [...prev, ...response.sheetMusic])
      }
      
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch public sheet music')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchPublicSheetMusic({
        limit: pagination.limit,
        offset: pagination.offset + pagination.limit
      })
    }
  }

  return {
    sheetMusic,
    loading,
    error,
    pagination,
    fetchPublicSheetMusic,
    loadMore
  }
}