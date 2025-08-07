import { useState, useEffect, useCallback } from 'react'
import { SearchSheetMusicParams, SearchSheetMusicResponse } from '@/types/sheet-music'

interface UseSheetMusicSearchOptions {
  initialParams?: SearchSheetMusicParams
  autoSearch?: boolean
  debounceMs?: number
}

export function useSheetMusicSearch(options: UseSheetMusicSearchOptions = {}) {
  const {
    initialParams = {},
    autoSearch = true,
    debounceMs = 300
  } = options

  const [params, setParams] = useState<SearchSheetMusicParams>(initialParams)
  const [data, setData] = useState<SearchSheetMusicResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search function
  const search = useCallback(
    async (searchParams: SearchSheetMusicParams) => {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        
        if (searchParams.search) queryParams.set('search', searchParams.search)
        if (searchParams.categoryId) queryParams.set('categoryId', searchParams.categoryId.toString())
        if (searchParams.isPublic !== undefined) queryParams.set('isPublic', searchParams.isPublic.toString())
        if (searchParams.limit) queryParams.set('limit', searchParams.limit.toString())
        if (searchParams.offset) queryParams.set('offset', searchParams.offset.toString())
        if (searchParams.sortBy) queryParams.set('sortBy', searchParams.sortBy)
        if (searchParams.sortOrder) queryParams.set('sortOrder', searchParams.sortOrder)

        const response = await fetch(`/api/sheet/search?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`)
        }

        const result: SearchSheetMusicResponse = await response.json()
        setData(result)
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced search effect
  useEffect(() => {
    if (!autoSearch) return

    const timeoutId = setTimeout(() => {
      search(params)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [params, search, autoSearch, debounceMs])

  // Update search parameters
  const updateParams = useCallback((newParams: Partial<SearchSheetMusicParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }, [])

  // Reset search
  const reset = useCallback(() => {
    setParams(initialParams)
    setData(null)
    setError(null)
  }, [initialParams])

  // Manual search trigger
  const triggerSearch = useCallback(() => {
    search(params)
  }, [search, params])

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (!data || !data.pagination.hasMore || loading) return

    const nextOffset = data.pagination.offset + data.pagination.limit
    
    try {
      setLoading(true)
      const moreData = await search({ ...params, offset: nextOffset })
      
      // This won't work as intended since search() updates state
      // We need to handle this differently
      setData(prevData => {
        if (!prevData) return data
        
        return {
          ...data,
          sheetMusic: [...prevData.sheetMusic, ...data.sheetMusic],
          pagination: data.pagination
        }
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setLoading(false)
    }
  }, [data, params, search, loading])

  return {
    // State
    params,
    data,
    loading,
    error,
    
    // Actions
    updateParams,
    triggerSearch,
    loadMore,
    reset,
    
    // Computed
    hasResults: data?.sheetMusic && data.sheetMusic.length > 0,
    hasMore: data?.pagination.hasMore || false,
    total: data?.pagination.total || 0
  }
}