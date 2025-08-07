import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfirmDialog, { DeleteConfirmDialog } from '@/components/ui/ConfirmDialog'

describe('ConfirmDialog Component', () => {
  const mockOnClose = jest.fn()
  const mockOnConfirm = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = 'unset'
  })

  afterEach(() => {
    // Clean up any remaining event listeners
    document.body.style.overflow = 'unset'
  })

  test('renders dialog when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Dialog"
        message="Test message"
      />
    )

    expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
    expect(screen.getByText('확인')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  test('does not render dialog when closed', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('calls onConfirm when confirm button is clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    fireEvent.click(screen.getByText('확인'))
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when cancel button is clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    fireEvent.click(screen.getByText('취소'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when Escape key is pressed', async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  test('calls onClose when backdrop is clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const backdrop = document.querySelector('.bg-gray-500')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  test('applies correct styles for danger type', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        type="danger"
        title="Danger Dialog"
      />
    )

    const confirmButton = screen.getByText('확인')
    expect(confirmButton).toHaveClass('bg-red-500')
    
    const title = screen.getByText('Danger Dialog')
    expect(title).toHaveClass('text-red-900')
  })

  test('applies correct styles for warning type', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        type="warning"
        title="Warning Dialog"
      />
    )

    const confirmButton = screen.getByText('확인')
    expect(confirmButton).toHaveClass('bg-orange-500')
    
    const title = screen.getByText('Warning Dialog')
    expect(title).toHaveClass('text-orange-900')
  })

  test('renders custom children instead of message', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="This should not appear"
      >
        <div>Custom content</div>
      </ConfirmDialog>
    )

    expect(screen.getByText('Custom content')).toBeInTheDocument()
    expect(screen.queryByText('This should not appear')).not.toBeInTheDocument()
  })

  test('prevents body scroll when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(document.body.style.overflow).toBe('hidden')
  })
})

describe('DeleteConfirmDialog Component', () => {
  const mockOnClose = jest.fn()
  const mockOnConfirm = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders delete confirmation dialog with item details', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        itemName="Test Item"
        itemType="테스트"
      />
    )

    expect(screen.getByText('삭제 확인')).toBeInTheDocument()
    expect(screen.getByText(/Test Item.*테스트을\(를\) 삭제하시겠습니까?/)).toBeInTheDocument()
    expect(screen.getByText('주의: 이 작업은 되돌릴 수 없습니다')).toBeInTheDocument()
    expect(screen.getByText('삭제')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  test('shows detailed warning information', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        itemName="Test Sheet"
        itemType="악보"
      />
    )

    expect(screen.getByText('연관된 모든 데이터가 함께 삭제됩니다')).toBeInTheDocument()
    expect(screen.getByText('연습 기록 및 통계가 사라집니다')).toBeInTheDocument()
    expect(screen.getByText('파일 저장소에서도 완전히 제거됩니다')).toBeInTheDocument()
  })

  test('uses default values when itemName and itemType are not provided', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('항목을(를) 삭제하시겠습니까?')).toBeInTheDocument()
  })
})