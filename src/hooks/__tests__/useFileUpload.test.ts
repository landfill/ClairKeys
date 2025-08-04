import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from '../useFileUpload'

// Mock fetch
global.fetch = jest.fn()

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFileUpload())

    expect(result.current.uploadState).toEqual({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    })
  })

  it('validates file type correctly', () => {
    const { result } = renderHook(() => useFileUpload())

    // Valid PDF file
    const validFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')
    expect(result.current.validateFile(validFile)).toBeNull()

    // Invalid file type
    const invalidFile = createMockFile('test.txt', 1024 * 1024, 'text/plain')
    expect(result.current.validateFile(invalidFile)).toBe('PDF 파일만 업로드 가능합니다.')
  })

  it('validates file size correctly', () => {
    const { result } = renderHook(() => useFileUpload({
      maxSizeBytes: 5 * 1024 * 1024 // 5MB
    }))

    // Valid size
    const validFile = createMockFile('test.pdf', 3 * 1024 * 1024, 'application/pdf')
    expect(result.current.validateFile(validFile)).toBeNull()

    // Too large
    const largeFile = createMockFile('test.pdf', 10 * 1024 * 1024, 'application/pdf')
    expect(result.current.validateFile(largeFile)).toBe('파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다.')
  })

  it('validates empty file', () => {
    const { result } = renderHook(() => useFileUpload())

    const emptyFile = createMockFile('test.pdf', 0, 'application/pdf')
    expect(result.current.validateFile(emptyFile)).toBe('빈 파일은 업로드할 수 없습니다.')
  })

  it('validates metadata before upload', async () => {
    const { result } = renderHook(() => useFileUpload())
    const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')

    // Missing title
    await act(async () => {
      const uploadResult = await result.current.uploadFile(file, {
        title: '',
        composer: 'Test Composer'
      })
      expect(uploadResult).toBeNull()
    })

    expect(result.current.uploadState.error).toBe('곡명을 입력해주세요.')

    // Reset state
    act(() => {
      result.current.resetUpload()
    })

    // Missing composer
    await act(async () => {
      const uploadResult = await result.current.uploadFile(file, {
        title: 'Test Title',
        composer: ''
      })
      expect(uploadResult).toBeNull()
    })

    expect(result.current.uploadState.error).toBe('저작자를 입력해주세요.')
  })

  it('handles successful upload', async () => {
    const mockResponse = {
      success: true,
      sheetMusic: {
        id: '1',
        title: 'Test Title',
        composer: 'Test Composer'
      }
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const onSuccess = jest.fn()
    const { result } = renderHook(() => useFileUpload({ onSuccess }))

    const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')
    const metadata = {
      title: 'Test Title',
      composer: 'Test Composer',
      category: 'classical',
      isPublic: true
    }

    let uploadResult: any
    await act(async () => {
      uploadResult = await result.current.uploadFile(file, metadata)
    })

    expect(fetch).toHaveBeenCalledWith('/api/upload', {
      method: 'POST',
      body: expect.any(FormData)
    })

    expect(result.current.uploadState.success).toBe(true)
    expect(result.current.uploadState.isUploading).toBe(false)
    expect(result.current.uploadState.progress).toBe(100)
    expect(result.current.uploadState.error).toBeNull()
    expect(onSuccess).toHaveBeenCalledWith(mockResponse)
    expect(uploadResult).toEqual(mockResponse)
  })

  it('handles upload failure', async () => {
    const errorMessage = 'Upload failed'
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: errorMessage })
    })

    const onError = jest.fn()
    const { result } = renderHook(() => useFileUpload({ onError }))

    const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')
    const metadata = {
      title: 'Test Title',
      composer: 'Test Composer'
    }

    let uploadResult: any
    await act(async () => {
      uploadResult = await result.current.uploadFile(file, metadata)
    })

    expect(result.current.uploadState.success).toBe(false)
    expect(result.current.uploadState.isUploading).toBe(false)
    expect(result.current.uploadState.error).toBe(errorMessage)
    expect(onError).toHaveBeenCalledWith(errorMessage)
    expect(uploadResult).toBeNull()
  })

  it('handles network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const onError = jest.fn()
    const { result } = renderHook(() => useFileUpload({ onError }))

    const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf')
    const metadata = {
      title: 'Test Title',
      composer: 'Test Composer'
    }

    let uploadResult: any
    await act(async () => {
      uploadResult = await result.current.uploadFile(file, metadata)
    })

    expect(result.current.uploadState.error).toBe('Network error')
    expect(onError).toHaveBeenCalledWith('Network error')
    expect(uploadResult).toBeNull()
  })

  it('resets upload state correctly', () => {
    const { result } = renderHook(() => useFileUpload())

    // Set some state
    act(() => {
      result.current.uploadState.error = 'Some error'
      result.current.uploadState.success = true
      result.current.uploadState.progress = 50
    })

    // Reset
    act(() => {
      result.current.resetUpload()
    })

    expect(result.current.uploadState).toEqual({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    })
  })
})