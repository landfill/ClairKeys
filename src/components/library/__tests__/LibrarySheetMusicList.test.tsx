import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LibrarySheetMusicList } from '../LibrarySheetMusicList'
import { useSheetMusic } from '@/hooks/useSheetMusic'
import { useCategories } from '@/hooks/useCategories'

jest.mock('@/hooks/useSheetMusic')
jest.mock('@/hooks/useCategories')

const mockUseSheetMusic = useSheetMusic as jest.MockedFunction<typeof useSheetMusic>
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>

const sheets = [
  { id: 1, title: '연습 가능', composer: '작곡가', userId: 'user-1', categoryId: null, category: null, isPublic: false, animationDataUrl: 'url', provenance: 'omr' as const, availability: 'ready' as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, title: '처리 중 악보', composer: '작곡가', userId: 'user-1', categoryId: null, category: null, isPublic: false, animationDataUrl: '', provenance: 'omr' as const, availability: 'processing' as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, title: '오류 악보', composer: '작곡가', userId: 'user-1', categoryId: null, category: null, isPublic: false, animationDataUrl: '', provenance: 'omr' as const, availability: 'failed' as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, title: '확인 악보', composer: '작곡가', userId: 'user-1', categoryId: null, category: null, isPublic: false, animationDataUrl: '', provenance: 'omr' as const, availability: 'unknown' as const, createdAt: new Date(), updatedAt: new Date() },
]

describe('LibrarySheetMusicList', () => {
  const fetchUserSheetMusic = jest.fn()
  const updateSheetMusic = jest.fn().mockResolvedValue({})

  beforeEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    mockUseSheetMusic.mockReturnValue({
      sheetMusic: sheets,
      loading: false,
      error: null,
      fetchUserSheetMusic,
      updateSheetMusic,
      deleteSheetMusic: jest.fn(),
      createSheetMusic: jest.fn(),
    })
    mockUseCategories.mockReturnValue({
      categories: [], loading: false, error: null, fetchCategories: jest.fn(), createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
    })
  })

  it('distinguishes all derived availability states without exposing raw processing values', () => {
    render(<LibrarySheetMusicList />)

    expect(screen.getAllByText('연습 가능')).toHaveLength(2)
    expect(screen.getAllByText('처리 중')).toHaveLength(2)
    expect(screen.getByText('변환 오류')).toBeInTheDocument()
    expect(screen.getByText('확인 필요')).toBeInTheDocument()
    expect(screen.queryByText('pending')).not.toBeInTheDocument()
    // stage4에서 카드 동작의 접근 가능한 이름에 곡명이 붙었다. 보이는 글자와 이동 경로는 그대로다.
    expect(screen.getByRole('link', { name: '연습 가능 연습 시작' })).toHaveAttribute('href', '/sheet/1')
    expect(screen.getAllByRole('link', { name: /다시 업로드$/ })).toHaveLength(2)
  })

  it('edits a user title from the keyboard-accessible dialog', async () => {
    render(<LibrarySheetMusicList />)

    fireEvent.click(screen.getByRole('button', { name: '연습 가능 제목 수정' }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 제목' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(updateSheetMusic).toHaveBeenCalledWith(1, { title: '새 제목' }))
  })

  it('submits a printed dotted-quarter tempo as quarter BPM from the live edit dialog', async () => {
    render(<LibrarySheetMusicList />)
    fireEvent.click(screen.getByRole('button', { name: '연습 가능 제목 수정' }))
    fireEvent.change(screen.getByLabelText('빠르기 (BPM)'), { target: { value: '46' } })
    fireEvent.change(screen.getByLabelText('박 단위'), { target: { value: 'dotted-quarter' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(updateSheetMusic).toHaveBeenCalledWith(1, { title: '연습 가능', tempo: 69 }))
  })

  it('explains why a whitespace-only title cannot be saved', async () => {
    render(<LibrarySheetMusicList />)

    fireEvent.click(screen.getByRole('button', { name: '연습 가능 제목 수정' }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('제목을 입력해 주세요.')).toBeInTheDocument()
    expect(updateSheetMusic).not.toHaveBeenCalled()
  })

  it('offers an upload action for an empty library', () => {
    mockUseSheetMusic.mockReturnValue({
      ...mockUseSheetMusic(),
      sheetMusic: [],
    })

    render(<LibrarySheetMusicList />)

    expect(screen.getByText('악보가 없습니다')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '새 악보 업로드' })).toHaveAttribute('href', '/upload')
  })

  /**
   * 이슈 #146 stage 4. 불러오기가 실패했을 때 "악보가 없습니다"라고 말하면 원인이 바뀌는데
   * 다음 행동은 그대로다 — 목록을 못 받은 사람에게 업로드를 권하게 된다. DS-7의 규칙은
   * 무엇이 잘못됐는지와 무엇을 하면 되는지를 함께 말하는 것이다.
   */
  it('reports a failed load as a failure instead of an empty library', () => {
    mockUseSheetMusic.mockReturnValue({
      ...mockUseSheetMusic(),
      sheetMusic: [],
      error: 'Failed to fetch sheet music: Internal Server Error',
    })

    render(<LibrarySheetMusicList />)

    expect(screen.getByRole('alert')).toHaveTextContent('악보 목록을 불러오지 못했습니다')
    expect(screen.queryByText('악보가 없습니다')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '새 악보 업로드' })).not.toBeInTheDocument()
  })

  it('retries the same query from the failure state', () => {
    mockUseSheetMusic.mockReturnValue({
      ...mockUseSheetMusic(),
      sheetMusic: [],
      error: 'Failed to fetch sheet music: Internal Server Error',
    })

    render(<LibrarySheetMusicList selectedCategoryId={3} searchQuery="" />)
    fetchUserSheetMusic.mockClear()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(fetchUserSheetMusic).toHaveBeenCalledWith({ categoryId: 3, search: undefined })
  })

  /**
   * `useSheetMusic`의 `error`는 수정·삭제 실패에도 설정된다. 그 값을 그대로 읽어 목록을 대체하면
   * 제목 저장이 실패한 사람이 "목록을 불러오지 못했습니다"를 보게 된다 — 원인을 잘못 말하는 것은
   * 빈 상태로 말하는 것과 같은 결함이다. 그래서 실패 화면은 보여줄 목록이 없을 때만 나온다.
   */
  it('keeps the list when the failure was a save, not a load', () => {
    mockUseSheetMusic.mockReturnValue({
      ...mockUseSheetMusic(),
      sheetMusic: sheets,
      error: 'Failed to update sheet music: Internal Server Error',
    })

    render(<LibrarySheetMusicList />)

    expect(screen.getAllByText('연습 가능')).toHaveLength(2)
    expect(screen.queryByText('악보 목록을 불러오지 못했습니다')).not.toBeInTheDocument()
  })

  it('does not hide a real failure behind the raw server message', () => {
    mockUseSheetMusic.mockReturnValue({
      ...mockUseSheetMusic(),
      sheetMusic: [],
      error: 'Failed to fetch sheet music: Internal Server Error',
    })

    render(<LibrarySheetMusicList />)

    // 원시 서버 문구 노출 금지는 이슈 #146의 상태 표현 규칙이다.
    expect(screen.queryByText(/Internal Server Error/)).not.toBeInTheDocument()
  })

  it('uses a rounded category control surface', () => {
    mockUseCategories.mockReturnValue({
      categories: [{ id: 1, name: 'classic', userId: 'user-1', createdAt: new Date() }],
      loading: false, error: null, fetchCategories: jest.fn(), createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
    })

    render(<LibrarySheetMusicList showCategorySelector />)

    expect(screen.getByRole('button', { name: '📁 classic' })).toHaveClass('rounded-2xl')
  })

  it('shows loaded sheets without waiting for the category request', () => {
    mockUseCategories.mockReturnValue({
      categories: [], loading: true, error: null, fetchCategories: jest.fn(), createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
    })

    render(<LibrarySheetMusicList />)

    expect(screen.getAllByText('연습 가능')).toHaveLength(2)
  })

  it('debounces rapid library search requests after the initial load', () => {
    jest.useFakeTimers()
    const { rerender } = render(<LibrarySheetMusicList searchQuery="" />)
    expect(fetchUserSheetMusic).toHaveBeenCalledTimes(1)
    fetchUserSheetMusic.mockClear()

    rerender(<LibrarySheetMusicList searchQuery="b" />)
    rerender(<LibrarySheetMusicList searchQuery="ba" />)
    rerender(<LibrarySheetMusicList searchQuery="bach" />)

    expect(fetchUserSheetMusic).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(fetchUserSheetMusic).toHaveBeenCalledTimes(1)
    expect(fetchUserSheetMusic).toHaveBeenCalledWith({
      categoryId: undefined,
      search: 'bach'
    })
  })
})
