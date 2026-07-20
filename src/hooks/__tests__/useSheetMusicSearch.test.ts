import { act, renderHook, waitFor } from '@testing-library/react'
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
})
