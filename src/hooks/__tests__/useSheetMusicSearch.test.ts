import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, StrictMode, type ReactNode } from 'react'
import { useSheetMusicSearch } from '../useSheetMusicSearch'
import { SearchSheetMusicResponse, SheetMusicWithOwner } from '@/types/sheet-music'

const makeSheetMusic = (id: number): SheetMusicWithOwner => ({
  id,
  title: `Score ${id}`,
  composer: `Composer ${id}`,
  userId: 'user-1',
  categoryId: null,
  isPublic: true,
  animationDataUrl: `/scores/${id}.json`,
  provenance: 'omr',
  createdAt: new Date(2026, 0, id),
  updatedAt: new Date(2026, 0, id),
  category: null,
  owner: null
})

const makePage = (
  sheetMusic: SheetMusicWithOwner[],
  offset: number,
  hasMore: boolean
): SearchSheetMusicResponse => ({
  success: true,
  sheetMusic,
  pagination: {
    total: 3,
    limit: 2,
    offset,
    hasMore
  }
})

describe('useSheetMusicSearch', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    jest.useRealTimers()
    global.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      const offset = Number(url.searchParams.get('offset') || 0)
      const page = offset === 2
        ? makePage([makeSheetMusic(3)], 2, false)
        : makePage([makeSheetMusic(1), makeSheetMusic(2)], 0, true)

      return {
        ok: true,
        json: async () => page
      } as Response
    })
  })

  it('appends the next page and advances pagination metadata', async () => {
    const { result } = renderHook(() => useSheetMusicSearch({
      autoSearch: false,
      initialParams: { limit: 2, offset: 0 }
    }))

    act(() => {
      result.current.triggerSearch()
    })

    await waitFor(() => {
      expect(result.current.data?.sheetMusic.map(item => item.id)).toEqual([1, 2])
    })

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.data?.sheetMusic.map(item => item.id)).toEqual([1, 2, 3])
    expect(result.current.data?.pagination).toEqual({
      total: 3,
      limit: 2,
      offset: 2,
      hasMore: false
    })
  })

  it('starts the initial automatic search without paying the typing debounce', async () => {
    jest.useFakeTimers()

    renderHook(() => useSheetMusicSearch({
      autoSearch: true,
      debounceMs: 500,
      initialParams: { isPublic: true, limit: 10 }
    }))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  })

  it('does not search again when parameter values did not change', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useSheetMusicSearch({
      autoSearch: true,
      debounceMs: 500,
      initialParams: { isPublic: true, limit: 10, sortBy: 'newest', offset: 0 }
    }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      result.current.updateParams({ isPublic: true, sortBy: 'newest', offset: 0 })
      jest.advanceTimersByTime(500)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not duplicate the initial request when Strict Mode replays effects', async () => {
    jest.useFakeTimers()
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(StrictMode, null, children)
    )

    renderHook(() => useSheetMusicSearch({
      autoSearch: true,
      debounceMs: 500,
      initialParams: { isPublic: true, limit: 10 }
    }), { wrapper })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  })

  it('cancels a pending debounced search when the user submits manually', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useSheetMusicSearch({
      autoSearch: true,
      debounceMs: 500,
      initialParams: { isPublic: true, limit: 10 }
    }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateParams({ search: 'bach' })
    })
    act(() => {
      result.current.triggerSearch()
      jest.advanceTimersByTime(500)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  })
})
