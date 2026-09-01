import { render, screen } from '@testing-library/react'
import SheetMusicSearch from '../SheetMusicSearch'
import { useSheetMusicSearch } from '@/hooks/useSheetMusicSearch'
import { useCategories } from '@/hooks/useCategories'

jest.mock('@/hooks/useSheetMusicSearch')
jest.mock('@/hooks/useCategories')

const mockUseSheetMusicSearch = useSheetMusicSearch as jest.MockedFunction<typeof useSheetMusicSearch>
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>

describe('SheetMusicSearch request surface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
