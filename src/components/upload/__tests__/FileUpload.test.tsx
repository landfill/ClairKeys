import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FileUpload from '../FileUpload'

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn()
  const mockOnFileRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders upload area correctly', () => {
    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={null}
      />
    )

    expect(screen.getByText('PDF 파일을 드래그하거나 클릭하세요')).toBeInTheDocument()
    expect(screen.getByText('최대 10MB까지 업로드 가능')).toBeInTheDocument()
    expect(screen.getByText('파일 선택')).toBeInTheDocument()
  })

  it('shows selected file information', () => {
    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf') // 1MB

    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={mockFile}
      />
    )

    expect(screen.getByText('파일이 선택되었습니다')).toBeInTheDocument()
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByText('1 MB')).toBeInTheDocument()
    expect(screen.getByText('다른 파일 선택')).toBeInTheDocument()
  })

  it('shows upload progress when uploading', () => {
    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')

    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={mockFile}
        isUploading={true}
        uploadProgress={50}
      />
    )

    expect(screen.getByText('업로드 중...')).toBeInTheDocument()
    expect(screen.getByText('50% 완료')).toBeInTheDocument()
  })

  it('shows error state', () => {
    const errorMessage = '파일 업로드에 실패했습니다'

    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={null}
        error={errorMessage}
      />
    )

    expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('다시 시도')).toBeInTheDocument()
  })

  it('handles file selection via input', async () => {
    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={null}
      />
    )

    const fileInput = screen.getByRole('button', { name: '파일 선택' }).parentElement?.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()

    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')
    
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } })
    }

    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
    })
  })

  it('handles drag and drop', async () => {
    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={null}
      />
    )

    const dropzone = screen.getByText('PDF 파일을 드래그하거나 클릭하세요').closest('div')
    expect(dropzone).toBeInTheDocument()

    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')

    // Simulate drag enter
    if (dropzone) {
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { files: [mockFile] }
      })
    }

    await waitFor(() => {
      expect(screen.getByText('PDF 파일을 여기에 놓으세요')).toBeInTheDocument()
    })

    // Simulate drop
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [mockFile] }
      })
    }

    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
    })
  })

  it('calls onFileRemove when remove button is clicked', () => {
    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')

    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={mockFile}
      />
    )

    const removeButton = screen.getByText('다른 파일 선택')
    fireEvent.click(removeButton)

    expect(mockOnFileRemove).toHaveBeenCalled()
  })

  it('disables interaction when uploading', () => {
    const mockFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')

    render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        onFileRemove={mockOnFileRemove}
        selectedFile={mockFile}
        isUploading={true}
      />
    )

    const dropzone = screen.getByText('업로드 중...').closest('div')
    expect(dropzone).toHaveClass('cursor-not-allowed')

    // File input should be disabled
    const fileInput = dropzone?.querySelector('input[type="file"]')
    expect(fileInput).toBeDisabled()
  })

  it('formats file size correctly', () => {
    const testCases = [
      { file: createMockFile('test1.pdf', 1024, 'application/pdf'), expected: '1 KB' },
      { file: createMockFile('test2.pdf', 1024 * 1024, 'application/pdf'), expected: '1 MB' },
      { file: createMockFile('test3.pdf', 1024 * 1024 * 2.5, 'application/pdf'), expected: '2.5 MB' },
    ]

    testCases.forEach(({ file, expected }) => {
      const { rerender } = render(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          onFileRemove={mockOnFileRemove}
          selectedFile={file}
        />
      )

      expect(screen.getByText(expected)).toBeInTheDocument()
      
      // Clean up for next iteration
      rerender(
        <FileUpload
          onFileSelect={mockOnFileSelect}
          onFileRemove={mockOnFileRemove}
          selectedFile={null}
        />
      )
    })
  })
})