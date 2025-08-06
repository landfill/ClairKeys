import { renderHook, act, waitFor } from '@testing-library/react'
import { useBackgroundProcessing } from '../useBackgroundProcessing'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('useBackgroundProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('fetchJobs', () => {
    it('should fetch processing jobs successfully', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          fileName: 'test.pdf',
          status: 'PROCESSING',
          progress: 50,
          metadata: { title: 'Test Song', composer: 'Test Composer' },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs }),
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      await act(async () => {
        await result.current.fetchJobs(10)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/processing?limit=10')
      expect(result.current.jobs).toEqual(mockJobs)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle fetch jobs error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      await act(async () => {
        await result.current.fetchJobs(10)
      })

      expect(result.current.jobs).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch processing jobs')
    })
  })

  describe('fetchNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'JOB_COMPLETED',
          title: '처리 완료',
          message: '처리가 완료되었습니다.',
          isRead: false,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      await act(async () => {
        await result.current.fetchNotifications(20)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications?limit=20')
      expect(result.current.notifications).toEqual(mockNotifications)
    })
  })

  describe('createBackgroundJob', () => {
    it('should create background job successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const mockMetadata = {
        title: 'Test Song',
        composer: 'Test Composer',
        isPublic: false,
      }
      const mockResult = {
        success: true,
        jobId: 'job-123',
        message: '파일이 백그라운드에서 처리됩니다.',
      }

      // Mock successful job creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      })

      // Mock fetchJobs and fetchNotifications calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      let jobResult
      await act(async () => {
        jobResult = await result.current.createBackgroundJob(mockFile, mockMetadata)
      })

      expect(jobResult).toEqual(mockResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/processing', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    it('should handle validation errors', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const mockMetadata = {
        title: '', // Empty title should cause validation error
        composer: 'Test Composer',
        isPublic: false,
      }

      const { result } = renderHook(() => useBackgroundProcessing())

      await act(async () => {
        try {
          await result.current.createBackgroundJob(mockFile, mockMetadata)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Title is required')
        }
      })

      expect(result.current.error).toBe('Title is required')
    })

    it('should handle API errors', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const mockMetadata = {
        title: 'Test Song',
        composer: 'Test Composer',
        isPublic: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'File too large' }),
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      await act(async () => {
        try {
          await result.current.createBackgroundJob(mockFile, mockMetadata)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('File too large')
        }
      })

      expect(result.current.error).toBe('File too large')
    })
  })

  describe('cancelJob', () => {
    it('should cancel job successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Job cancelled successfully' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobs: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: [] }),
        })

      const { result } = renderHook(() => useBackgroundProcessing())

      let cancelResult
      await act(async () => {
        cancelResult = await result.current.cancelJob('job-1')
      })

      expect(cancelResult).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/processing/job-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      })
    })
  })

  describe('retryJob', () => {
    it('should retry job successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Job retry initiated' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobs: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: [] }),
        })

      const { result } = renderHook(() => useBackgroundProcessing())

      let retryResult
      await act(async () => {
        retryResult = await result.current.retryJob('job-1')
      })

      expect(retryResult).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/processing/job-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'retry' }),
      })
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useBackgroundProcessing())

      // Set initial notifications
      act(() => {
        result.current.notifications.push({
          id: 'notif-1',
          type: 'JOB_COMPLETED',
          title: '처리 완료',
          message: '처리가 완료되었습니다.',
          isRead: false,
          createdAt: new Date().toISOString(),
        })
      })

      let markResult
      await act(async () => {
        markResult = await result.current.markNotificationAsRead('notif-1')
      })

      expect(markResult).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/notif-1', {
        method: 'PATCH',
      })
    })
  })

  describe('polling', () => {
    it('should start polling when there are active jobs', async () => {
      const mockJobsWithActive = [
        {
          id: 'job-1',
          status: 'PROCESSING',
          fileName: 'test.pdf',
          progress: 50,
        },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobs: mockJobsWithActive }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: [] }),
        })

      const { result } = renderHook(() => useBackgroundProcessing())

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.jobs).toEqual(mockJobsWithActive)
      })

      // Should start polling
      expect(result.current.isPolling).toBe(true)
    })

    it('should stop polling when no active jobs', async () => {
      const mockJobsCompleted = [
        {
          id: 'job-1',
          status: 'COMPLETED',
          fileName: 'test.pdf',
          progress: 100,
        },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobs: mockJobsCompleted }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: [] }),
        })

      const { result } = renderHook(() => useBackgroundProcessing())

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.jobs).toEqual(mockJobsCompleted)
      })

      // Should not start polling for completed jobs
      expect(result.current.isPolling).toBe(false)
    })
  })
})