import { useState, useEffect, useCallback, useRef } from 'react'
import { PublicSheetMusicListResponse, PublicSheetMusicQuery } from '@/types/sheet-music'

interface UsePublicSheetMusicOptions {
  initialParams?: PublicSheetMusicQuery
  autoSearch?: boolean
  debounceMs?: number
}

const paramsKey = (params: PublicSheetMusicQuery) => JSON.stringify([
  params.search ?? null,
  params.categoryId ?? null,
  params.limit ?? null,
  params.offset ?? null,
  params.sortBy ?? null,
])

/**
 * The explore page's one list (#197, D-091): the public sheets, narrowed by
 * search, category and sort, a page at a time. Typing waits out a debounce; a
 * change marked `immediate` (a choice from a menu) is requested at once.
 */
export function usePublicSheetMusic(options: UsePublicSheetMusicOptions = {}) {
  const {
    initialParams = {},
    autoSearch = true,
    debounceMs = 300
  } = options

  const [params, setParams] = useState<PublicSheetMusicQuery>(initialParams)
  const [data, setData] = useState<PublicSheetMusicListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasStartedAutoSearchRef = useRef(false)
  const lastAutoSearchKeyRef = useRef<string | null>(null)
  const queuedAutoSearchKeyRef = useRef<string | null>(null)
  const latestRequestRef = useRef(0)
  const immediateRef = useRef(false)
  const paramsRef = useRef(params)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Debounced search function
  const search = useCallback(
    async (searchParams: PublicSheetMusicQuery, append = false) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        
        if (searchParams.search) queryParams.set('search', searchParams.search)
        if (searchParams.categoryId) queryParams.set('categoryId', searchParams.categoryId.toString())
        if (searchParams.limit) queryParams.set('limit', searchParams.limit.toString())
        if (searchParams.offset) queryParams.set('offset', searchParams.offset.toString())
        if (searchParams.sortBy) queryParams.set('sortBy', searchParams.sortBy)

        const response = await fetch(`/api/sheet/public?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`)
        }

        const result: PublicSheetMusicListResponse = await response.json()
        if (requestId !== latestRequestRef.current) return

        setData(previous => {
          if (!append || !previous) return result

          return {
            ...result,
            sheetMusic: [...previous.sheetMusic, ...result.sheetMusic],
            // Only the first page carries the filter list.
            categories: result.categories ?? previous.categories
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

    const currentParamsKey = paramsKey(params)
    if (
      lastAutoSearchKeyRef.current === currentParamsKey ||
      queuedAutoSearchKeyRef.current === currentParamsKey
    ) {
      return
    }

    // The first search pays no debounce, and neither does a change the caller
    // marked immediate.
    if (!hasStartedAutoSearchRef.current || immediateRef.current) {
      hasStartedAutoSearchRef.current = true
      immediateRef.current = false
      lastAutoSearchKeyRef.current = currentParamsKey
      void search(params)
      return
    }

    queuedAutoSearchKeyRef.current = currentParamsKey
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      queuedAutoSearchKeyRef.current = null
      lastAutoSearchKeyRef.current = currentParamsKey
      void search(params)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (queuedAutoSearchKeyRef.current === currentParamsKey) {
        queuedAutoSearchKeyRef.current = null
      }
    }
  }, [params, search, autoSearch, debounceMs])

  // Update search parameters. `immediate` skips the debounce for this change;
  // an unchanged value requests nothing either way.
  const updateParams = useCallback((
    newParams: Partial<PublicSheetMusicQuery>,
    { immediate = false }: { immediate?: boolean } = {}
  ) => {
    setParams(prev => {
      const next = { ...prev, ...newParams }
      const changed = Object.keys(next).some(key => (
        next[key as keyof PublicSheetMusicQuery] !== prev[key as keyof PublicSheetMusicQuery]
      ))
      if (changed && immediate) immediateRef.current = true
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
    queuedAutoSearchKeyRef.current = null
    lastAutoSearchKeyRef.current = paramsKey(paramsRef.current)
    void search(paramsRef.current)
  }, [search])

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (!data || !data.pagination.hasMore || loading) return

    // Continue after what is on screen, whatever page size produced it.
    const nextOffset = data.sheetMusic.length
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
