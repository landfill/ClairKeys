import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryManager } from '../CategoryManager'
import { useCategories } from '@/hooks/useCategories'
import { Category } from '@/types/category'

// Mock the useCategories hook
jest.mock('@/hooks/useCategories')
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>

describe('CategoryManager', () => {
  const mockCategories: Category[] = [
    {
      id: 1,
      name: 'Classical',
      userId: 'user1',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      name: 'Pop',
      userId: 'user1',
      createdAt: new Date('2024-01-02'),
    },
  ]

  const mockHookReturn = {
    categories: mockCategories,
    loading: false,
    error: null,
    fetchCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCategories.mockReturnValue(mockHookReturn)
  })

  it('renders categories list', () => {
    render(<CategoryManager />)

    expect(screen.getByText('카테고리')).toBeInTheDocument()
    expect(screen.getByText('전체 악보')).toBeInTheDocument()
    expect(screen.getByText('Classical')).toBeInTheDocument()
    expect(screen.getByText('Pop')).toBeInTheDocument()
  })

  it('shows create button when showCreateButton is true', () => {
    render(<CategoryManager showCreateButton={true} />)

    expect(screen.getByText('+ 새 카테고리')).toBeInTheDocument()
  })

  it('hides create button when showCreateButton is false', () => {
    render(<CategoryManager showCreateButton={false} />)

    expect(screen.queryByText('+ 새 카테고리')).not.toBeInTheDocument()
  })

  it('highlights selected category', () => {
    render(<CategoryManager selectedCategoryId={1} />)

    const classicalCategory = screen.getByText('Classical').closest('div')
    expect(classicalCategory).toHaveClass('bg-blue-100', 'border-blue-500')
  })

  it('highlights "전체 악보" when selectedCategoryId is null', () => {
    render(<CategoryManager selectedCategoryId={null} />)

    const allCategory = screen.getByText('전체 악보').closest('div')
    expect(allCategory).toHaveClass('bg-blue-100', 'border-blue-500')
  })

  it('calls onCategorySelect when category is clicked', () => {
    const mockOnCategorySelect = jest.fn()
    render(<CategoryManager onCategorySelect={mockOnCategorySelect} />)

    fireEvent.click(screen.getByText('Classical'))

    expect(mockOnCategorySelect).toHaveBeenCalledWith(1)
  })

  it('calls onCategorySelect with null when "전체 악보" is clicked', () => {
    const mockOnCategorySelect = jest.fn()
    render(<CategoryManager onCategorySelect={mockOnCategorySelect} />)

    fireEvent.click(screen.getByText('전체 악보'))

    expect(mockOnCategorySelect).toHaveBeenCalledWith(null)
  })

  it('shows create form when create button is clicked', () => {
    render(<CategoryManager />)

    fireEvent.click(screen.getByText('+ 새 카테고리'))

    expect(screen.getByPlaceholderText('카테고리 이름')).toBeInTheDocument()
    expect(screen.getByText('생성')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  it('creates new category when form is submitted', async () => {
    const mockCreateCategory = jest.fn().mockResolvedValue({
      id: 3,
      name: 'Jazz',
      userId: 'user1',
      createdAt: new Date(),
    })
    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      createCategory: mockCreateCategory,
    })

    render(<CategoryManager />)

    fireEvent.click(screen.getByText('+ 새 카테고리'))
    
    const input = screen.getByPlaceholderText('카테고리 이름')
    fireEvent.change(input, { target: { value: 'Jazz' } })
    fireEvent.click(screen.getByText('생성'))

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'Jazz' })
    })
  })

  it('shows edit form when edit button is clicked', () => {
    render(<CategoryManager />)

    const editButtons = screen.getAllByText('수정')
    fireEvent.click(editButtons[0])

    expect(screen.getByDisplayValue('Classical')).toBeInTheDocument()
    expect(screen.getByText('저장')).toBeInTheDocument()
  })

  it('updates category when edit form is submitted', async () => {
    const mockUpdateCategory = jest.fn().mockResolvedValue({
      id: 1,
      name: 'Classical Music',
      userId: 'user1',
      createdAt: new Date(),
    })
    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      updateCategory: mockUpdateCategory,
    })

    render(<CategoryManager />)

    const editButtons = screen.getAllByText('수정')
    fireEvent.click(editButtons[0])

    const input = screen.getByDisplayValue('Classical')
    fireEvent.change(input, { target: { value: 'Classical Music' } })
    fireEvent.click(screen.getByText('저장'))

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(1, { name: 'Classical Music' })
    })
  })

  it('shows confirmation dialog when delete button is clicked', () => {
    // Mock window.confirm
    const mockConfirm = jest.fn().mockReturnValue(true)
    window.confirm = mockConfirm

    render(<CategoryManager />)

    const deleteButtons = screen.getAllByText('삭제')
    fireEvent.click(deleteButtons[0])

    expect(mockConfirm).toHaveBeenCalledWith(
      '이 카테고리를 삭제하시겠습니까? 카테고리 내의 악보들은 미분류로 이동됩니다.'
    )
  })

  it('deletes category when confirmed', async () => {
    const mockDeleteCategory = jest.fn().mockResolvedValue(undefined)
    const mockConfirm = jest.fn().mockReturnValue(true)
    window.confirm = mockConfirm

    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      deleteCategory: mockDeleteCategory,
    })

    render(<CategoryManager />)

    const deleteButtons = screen.getAllByText('삭제')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith(1)
    })
  })

  it('shows loading state', () => {
    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      loading: true,
    })

    render(<CategoryManager />)

    // Check for the loading spinner by looking for the animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows error message', () => {
    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      error: 'Failed to load categories',
    })

    render(<CategoryManager />)

    expect(screen.getByText('Failed to load categories')).toBeInTheDocument()
  })

  it('shows empty state when no categories exist', () => {
    mockUseCategories.mockReturnValue({
      ...mockHookReturn,
      categories: [],
    })

    render(<CategoryManager />)

    expect(screen.getByText('아직 카테고리가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('첫 번째 카테고리 만들기')).toBeInTheDocument()
  })
})