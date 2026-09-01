import { useState, useEffect, useCallback, useRef } from 'react'
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasStartedAutoSearchRef = useRef(false)
  const latestRequestRef = useRef(0)
  const paramsRef = useRef(params)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Debounced search function
  const search = useCallback(
    async (searchParams: SearchSheetMusicParams, append = false) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId
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
        if (requestId !== latestRequestRef.current) return

        setData(previous => {
          if (!append || !previous) return result

          return {
            ...result,
            sheetMusic: [...previous.sheetMusic, ...result.sheetMusic]
          }
        })
        
      } catch (err) {
        if (requestId !== latestRequestRef.current) return
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        setData(null)
      } finally {
        if (requestId === latestRequestRef.current) {
          setLoading(false)
        }
      }
    },
    []
  )

  // Debounced search effect
  useEffect(() => {
    if (!autoSearch) return

    if (!hasStartedAutoSearchRef.current) {
      hasStartedAutoSearchRef.current = true
      void search(params)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void search(params)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [params, search, autoSearch, debounceMs])

  // Update search parameters
  const updateParams = useCallback((newParams: Partial<SearchSheetMusicParams>) => {
    setParams(prev => {
      const next = { ...prev, ...newParams }
      const changed = Object.keys(next).some(key => (
        next[key as keyof SearchSheetMusicParams] !== prev[key as keyof SearchSheetMusicParams]
      ))
      return changed ? next : prev
    })
  }, [])

  // Reset search
  const reset = useCallback(() => {
    setParams(initialParams)
    setData(null)
    setError(null)
  }, [initialParams])

  // Manual search trigger
  const triggerSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    void search(paramsRef.current)
  }, [search])

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (!data || !data.pagination.hasMore || loading) return

    const nextOffset = data.pagination.offset + data.pagination.limit
    await search({ ...params, offset: nextOffset }, true)
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
