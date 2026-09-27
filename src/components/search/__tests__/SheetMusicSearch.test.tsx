import { fireEvent, render, screen } from '@testing-library/react'
import SheetMusicSearch from '../SheetMusicSearch'
import { useSheetMusicSearch } from '@/hooks/useSheetMusicSearch'
import { useCategories } from '@/hooks/useCategories'
import { useSession } from 'next-auth/react'

jest.mock('@/hooks/useSheetMusicSearch')
jest.mock('@/hooks/useCategories')
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const signedOut = () =>
  mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated', update: jest.fn() })
const signedIn = () =>
  mockUseSession.mockReturnValue({
    data: { user: { id: 'owner', name: '업로더' }, expires: '2099-01-01' },
    status: 'authenticated',
    update: jest.fn(),
  } as unknown as ReturnType<typeof useSession>)

const result = {
  id: 2,
  title: '월광 소나타',
  composer: '베토벤',
  userId: 'owner',
  categoryId: 7,
  category: { id: 7, name: '클래식' },
  isPublic: true,
  animationDataUrl: 'https://example.test/2.json',
  provenance: 'omr',
  createdAt: new Date('2026-03-04T00:00:00Z'),
  updatedAt: new Date('2026-03-04T00:00:00Z'),
  owner: { id: 'owner', name: '업로더' },
}

const withResults = () => {
  const current = mockUseSheetMusicSearch.getMockImplementation()?.({}) ?? mockUseSheetMusicSearch({})
  mockUseSheetMusicSearch.mockReturnValue({
    ...current,
    data: { ...current.data!, sheetMusic: [result] as never, pagination: { total: 1, limit: 10, offset: 0, hasMore: false } },
    hasResults: true,
    total: 1,
  })
}

const mockUseSheetMusicSearch = useSheetMusicSearch as jest.MockedFunction<typeof useSheetMusicSearch>
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>

describe('SheetMusicSearch request surface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    signedOut()
    mockUseSheetMusicSearch.mockReturnValue({
      params: { isPublic: true, limit: 10 },
      data: {
        success: true,
        sheetMusic: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        filters: {
          categories: [{ id: 7, name: '클래식', count: 4 }],
          totalPublic: 4,
          totalPrivate: 0,
        },
      },
      loading: false,
      error: null,
      updateParams: jest.fn(),
      triggerSearch: jest.fn(),
      loadMore: jest.fn(),
      reset: jest.fn(),
      hasResults: false,
      hasMore: false,
      total: 0,
    })
  })

  it('uses filter metadata from the search response instead of requesting user categories', () => {
    render(<SheetMusicSearch />)

    expect(screen.getByRole('option', { name: '클래식' })).toBeInTheDocument()
    expect(mockUseCategories).not.toHaveBeenCalled()
  })

  it('renders each result as a link to its sheet with the shared practice action', () => {
    withResults()
    render(<SheetMusicSearch />)

    const link = screen.getByRole('link', { name: /월광 소나타/ })
    expect(link).toHaveAttribute('href', '/sheet/2')
    expect(link).toHaveTextContent('연습 시작 →')
  })

  it('keeps owner-only visibility controls away from signed-out readers', () => {
    render(<SheetMusicSearch />)

    expect(screen.queryByLabelText('공개 설정')).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '내 비공개만' })).not.toBeInTheDocument()
    expect(screen.queryByText(/비공개: /)).not.toBeInTheDocument()
  })

  it('still offers the visibility filter to a signed-in owner', () => {
    signedIn()
    render(<SheetMusicSearch />)

    expect(screen.getByLabelText('공개 설정')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '내 비공개만' })).toBeInTheDocument()
  })

  it('uses design tokens instead of the legacy gray and blue palette', () => {
    withResults()
    const { container } = render(<SheetMusicSearch />)

    const forbidden = /(^|\s)(bg-white|text-gray-\d{3}|border-gray-\d{3}|hover:border-gray-\d{3}|border-blue-\d{3}|focus:ring-blue-\d{3})(\s|$)/
    const offenders = Array.from(container.querySelectorAll<HTMLElement>('[class]'))
      .map((n) => n.className)
      .filter((c) => typeof c === 'string' && forbidden.test(c))
    expect(offenders).toEqual([])
  })

  it('falls back to public results when the session is lost with the private filter selected', () => {
    signedIn()
    const { rerender } = render(<SheetMusicSearch />)
    fireEvent.change(screen.getByLabelText('공개 설정'), { target: { value: 'false' } })
    const updateParams = mockUseSheetMusicSearch.mock.results.at(-1)!.value.updateParams as jest.Mock
    expect(updateParams).toHaveBeenLastCalledWith(expect.objectContaining({ isPublic: false }))

    signedOut()
    rerender(<SheetMusicSearch />)
    // The filter is hidden now; a private request would only return 401.
    expect(updateParams).toHaveBeenLastCalledWith(expect.objectContaining({ isPublic: true }))
  })
})
