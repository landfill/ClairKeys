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
    expect(screen.getByRole('link', { name: '연습 시작' })).toHaveAttribute('href', '/sheet/1')
    expect(screen.getAllByRole('link', { name: '다시 업로드' })).toHaveLength(2)
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
