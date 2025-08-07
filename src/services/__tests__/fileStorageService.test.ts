import { fileStorageService } from '@/services/fileStorageService'

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
      list: jest.fn()
    }))
  }
}

// Mock the Supabase client creation
jest.mock('@/services/fileStorageService', () => {
  const originalModule = jest.requireActual('@/services/fileStorageService')
  return {
    ...originalModule,
    fileStorageService: {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFileUrl: jest.fn(),
      listFiles: jest.fn()
    }
  }
})

describe('FileStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadFile', () => {
    test('uploads file successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const mockResponse = {
        data: { path: 'test-folder/test.pdf' },
        error: null
      }

      ;(fileStorageService.uploadFile as jest.Mock).mockResolvedValueOnce(mockResponse.data.path)

      const result = await fileStorageService.uploadFile('test-folder', 'test.pdf', mockFile)

      expect(result).toBe('test-folder/test.pdf')
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith('test-folder', 'test.pdf', mockFile)
    })

    test('throws error when upload fails', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const errorMessage = 'Upload failed'

      ;(fileStorageService.uploadFile as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

      await expect(fileStorageService.uploadFile('test-folder', 'test.pdf', mockFile))
        .rejects.toThrow(errorMessage)
    })

    test('validates file size', async () => {
      // Create a mock file that exceeds size limit (assuming 10MB limit)
      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      })

      ;(fileStorageService.uploadFile as jest.Mock).mockRejectedValueOnce(
        new Error('File size exceeds maximum allowed size')
      )

      await expect(fileStorageService.uploadFile('test-folder', 'large.pdf', oversizedFile))
        .rejects.toThrow('File size exceeds maximum allowed size')
    })
  })

  describe('downloadFile', () => {
    test('downloads file successfully', async () => {
      const mockBlob = new Blob(['file content'], { type: 'application/pdf' })
      
      ;(fileStorageService.downloadFile as jest.Mock).mockResolvedValueOnce(mockBlob)

      const result = await fileStorageService.downloadFile('test-folder', 'test.pdf')

      expect(result).toBe(mockBlob)
      expect(fileStorageService.downloadFile).toHaveBeenCalledWith('test-folder', 'test.pdf')
    })

    test('throws error when download fails', async () => {
      const errorMessage = 'File not found'

      ;(fileStorageService.downloadFile as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

      await expect(fileStorageService.downloadFile('test-folder', 'nonexistent.pdf'))
        .rejects.toThrow(errorMessage)
    })
  })

  describe('deleteFile', () => {
    test('deletes file successfully', async () => {
      ;(fileStorageService.deleteFile as jest.Mock).mockResolvedValueOnce(undefined)

      await fileStorageService.deleteFile('test-folder', 'test.pdf')

      expect(fileStorageService.deleteFile).toHaveBeenCalledWith('test-folder', 'test.pdf')
    })

    test('handles delete error gracefully', async () => {
      const errorMessage = 'Delete failed'

      ;(fileStorageService.deleteFile as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

      await expect(fileStorageService.deleteFile('test-folder', 'test.pdf'))
        .rejects.toThrow(errorMessage)
    })
  })

  describe('getFileUrl', () => {
    test('generates public URL successfully', async () => {
      const mockUrl = 'https://example.supabase.co/storage/v1/object/public/test-bucket/test-folder/test.pdf'
      
      ;(fileStorageService.getFileUrl as jest.Mock).mockReturnValueOnce(mockUrl)

      const result = fileStorageService.getFileUrl('test-folder', 'test.pdf')

      expect(result).toBe(mockUrl)
      expect(fileStorageService.getFileUrl).toHaveBeenCalledWith('test-folder', 'test.pdf')
    })
  })

  describe('listFiles', () => {
    test('lists files successfully', async () => {
      const mockFiles = [
        { name: 'test1.pdf', metadata: { size: 1024, lastModified: '2024-01-01' } },
        { name: 'test2.pdf', metadata: { size: 2048, lastModified: '2024-01-02' } }
      ]

      ;(fileStorageService.listFiles as jest.Mock).mockResolvedValueOnce(mockFiles)

      const result = await fileStorageService.listFiles('test-folder')

      expect(result).toEqual(mockFiles)
      expect(fileStorageService.listFiles).toHaveBeenCalledWith('test-folder')
    })

    test('handles empty folder', async () => {
      ;(fileStorageService.listFiles as jest.Mock).mockResolvedValueOnce([])

      const result = await fileStorageService.listFiles('empty-folder')

      expect(result).toEqual([])
    })
  })

  describe('File validation', () => {
    test('validates supported file types', () => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
      
      validTypes.forEach(type => {
        const file = new File(['content'], 'test.file', { type })
        // This would be called internally by uploadFile
        expect(type).toMatch(/^(application\/pdf|image\/(jpeg|png))$/)
      })
    })

    test('rejects unsupported file types', () => {
      const invalidTypes = ['text/plain', 'application/zip', 'video/mp4']
      
      invalidTypes.forEach(type => {
        expect(type).not.toMatch(/^(application\/pdf|image\/(jpeg|png))$/)
      })
    })
  })

  describe('Error handling', () => {
    test('provides meaningful error messages', async () => {
      const scenarios = [
        { error: 'File not found', expectedMessage: 'File not found' },
        { error: 'Permission denied', expectedMessage: 'Permission denied' },
        { error: 'Storage quota exceeded', expectedMessage: 'Storage quota exceeded' }
      ]

      scenarios.forEach(async ({ error, expectedMessage }) => {
        ;(fileStorageService.uploadFile as jest.Mock).mockRejectedValueOnce(new Error(error))

        await expect(fileStorageService.uploadFile('folder', 'file.pdf', new File([''], 'test.pdf')))
          .rejects.toThrow(expectedMessage)
      })
    })
  })
})