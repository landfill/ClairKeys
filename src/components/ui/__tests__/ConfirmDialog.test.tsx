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

    fireEvent.click(screen.getByRole('button', { name: '확인' }))
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

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
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

    const backdrop = screen.getByRole('dialog')
    if (backdrop) {
      fireEvent.mouseDown(backdrop)
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
    expect(confirmButton).toHaveClass('bg-state-error')
    
    const title = screen.getByText('Danger Dialog')
    expect(title).toHaveClass('text-ink')
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
    expect(confirmButton).toHaveClass('bg-accent')
    
    const title = screen.getByText('Warning Dialog')
    expect(title).toHaveClass('text-ink')
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

    expect(screen.getByRole('heading', { name: '테스트 영구 삭제' })).toBeInTheDocument()
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '테스트 영구 삭제' })).toBeDisabled()
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

    expect(screen.getByText('악보와 연결된 연습 기록을 더 이상 사용할 수 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('파일 저장소에서도 완전히 제거됩니다')).not.toBeInTheDocument()
  })

  test('uses default values when itemName and itemType are not provided', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByRole('heading', { name: '항목 영구 삭제' })).toBeInTheDocument()
  })
})
