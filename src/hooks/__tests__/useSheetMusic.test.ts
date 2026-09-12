import { renderHook, act } from '@testing-library/react'
import { useSheetMusic } from '@/hooks/useSheetMusic'

// Mock fetch function
global.fetch = jest.fn()

// Mock session data
const mockSession = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User'
  }
}

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated'
  })
}))

describe('useSheetMusic Hook', () => {
  const mockSheetMusic = [
    {
      id: 1,
      title: 'Test Sheet 1',
      composer: 'Test Composer 1',
      categoryId: 1,
      category: { id: 1, name: 'Classical' },
      isPublic: false,
      animationDataUrl: 'http://example.com/data1.json',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 2,
      title: 'Test Sheet 2',
      composer: 'Test Composer 2',
      categoryId: null,
      category: null,
      isPublic: true,
      animationDataUrl: 'http://example.com/data2.json',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  /**
   * PR158 리뷰(P2). 훅의 `error`는 조회·수정·삭제 실패를 한 칸에 담고, 조회가 실패해도 이전 행을
   * 유지한다. 그래서 화면은 "지금 보이는 행이 방금 요청한 질의의 결과인지"를 `error`나 행 수로
   * 알 수 없다. 조회 함수가 성공 여부를 직접 돌려준다.
   */
  test('reports whether a list load succeeded, independently of the rows it keeps', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, sheetMusic: mockSheetMusic }),
    })
    const { result } = renderHook(() => useSheetMusic())

    let first: boolean | undefined
    await act(async () => { first = await result.current.fetchUserSheetMusic() })
    expect(first).toBe(true)

    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, statusText: 'Internal Server Error' })
    let second: boolean | undefined
    await act(async () => { second = await result.current.fetchUserSheetMusic({ categoryId: 3 }) })
    expect(second).toBe(false)
    // 이전 행은 그대로 남는다 — 같은 훅을 쓰는 카테고리 화면의 동작을 바꾸지 않기 위해서다.
    expect(result.current.sheetMusic).toHaveLength(2)
  })

  test('initializes with empty state', () => {
    const { result } = renderHook(() => useSheetMusic())

    expect(result.current.sheetMusic).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('fetches user sheet music successfully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sheetMusic: mockSheetMusic
      })
    })

    const { result } = renderHook(() => useSheetMusic())

    await act(async () => {
      await result.current.fetchUserSheetMusic()
    })

    expect(result.current.sheetMusic).toEqual(mockSheetMusic)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('handles fetch error correctly', async () => {
    const errorMessage = 'Failed to fetch sheet music: Internal Server Error'
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({
        success: false,
        error: errorMessage
      })
    })

    const { result } = renderHook(() => useSheetMusic())

    await act(async () => {
      await result.current.fetchUserSheetMusic()
    })

    expect(result.current.sheetMusic).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  test('updates sheet music successfully', async () => {
    ;(fetch as jest.Mock)
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sheetMusic: mockSheetMusic
        })
      })
      // Update request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sheetMusic: {
            ...mockSheetMusic[0],
            title: 'Updated Title'
          }
        })
      })

    const { result } = renderHook(() => useSheetMusic())

    // Load initial data
    await act(async () => {
      await result.current.fetchUserSheetMusic()
    })

    // Update sheet music
    await act(async () => {
      await result.current.updateSheetMusic(1, { title: 'Updated Title' })
    })

    expect(fetch).toHaveBeenCalledWith('/api/sheet/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Updated Title' })
    })
  })

  test('deletes sheet music successfully', async () => {
    ;(fetch as jest.Mock)
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sheetMusic: mockSheetMusic
        })
      })
      // Delete request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Sheet music deleted successfully'
        })
      })

    const { result } = renderHook(() => useSheetMusic())

    // Load initial data
    await act(async () => {
      await result.current.fetchUserSheetMusic()
    })

    // Delete sheet music
    await act(async () => {
      await result.current.deleteSheetMusic(1)
    })

    expect(fetch).toHaveBeenCalledWith('/api/sheet/1', {
      method: 'DELETE'
    })

    // Should remove the deleted item from state
    expect(result.current.sheetMusic).toEqual([mockSheetMusic[1]])
  })

  test('fetches sheet music with filters', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sheetMusic: [mockSheetMusic[0]]
      })
    })

    const { result } = renderHook(() => useSheetMusic())

    await act(async () => {
      await result.current.fetchUserSheetMusic({
        categoryId: 1,
        public: false,
        search: 'test'
      })
    })

    expect(fetch).toHaveBeenCalledWith('/api/sheet?categoryId=1&search=test&public=false')
  })

  test('handles network errors', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSheetMusic())

    await act(async () => {
      await result.current.fetchUserSheetMusic()
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.loading).toBe(false)
  })

  test('sets loading state correctly', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })

    ;(fetch as jest.Mock).mockReturnValueOnce(promise)

    const { result } = renderHook(() => useSheetMusic())

    // Start async operation
    act(() => {
      result.current.fetchUserSheetMusic()
    })

    // Loading should be true
    expect(result.current.loading).toBe(true)

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({
          success: true,
          sheetMusic: mockSheetMusic
        })
      })
    })

    // Loading should be false
    expect(result.current.loading).toBe(false)
  })
})