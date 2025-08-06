import backgroundProcessor from '../backgroundProcessor'
import { prisma } from '@/lib/prisma'
import { ProcessingStatus, ProcessingStage } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    processingJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    processingNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    sheetMusic: {
      create: jest.fn(),
    },
  },
}))

// Mock PDF parser
jest.mock('../pdfParser', () => ({
  getPDFParserService: () => ({
    parsePDF: jest.fn().mockResolvedValue({ notes: [], duration: 100, tempo: 120 }),
    validateAnimationData: jest.fn().mockReturnValue(true),
    serializeAnimationData: jest.fn().mockReturnValue('serialized-data'),
  }),
}))

describe('BackgroundProcessor', () => {
  const mockJobData = {
    id: 'test-job-1',
    userId: 'user-1',
    fileName: 'test.pdf',
    fileSize: 1024,
    fileBuffer: Buffer.from('test pdf content'),
    metadata: {
      title: 'Test Song',
      composer: 'Test Composer',
      categoryId: 1,
      isPublic: false,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('createJob', () => {
    it('should create a new processing job', async () => {
      const mockJob = {
        id: mockJobData.id,
        userId: mockJobData.userId,
        fileName: mockJobData.fileName,
        fileSize: mockJobData.fileSize,
        status: ProcessingStatus.PENDING,
        currentStage: ProcessingStage.UPLOAD,
        progress: 0,
        metadata: mockJobData.metadata,
        retryCount: 0,
        maxRetries: 3,
      }

      ;(prisma.processingJob.create as any).mockResolvedValue(mockJob)
      ;(prisma.processingNotification.create as any).mockResolvedValue({})

      const jobId = await backgroundProcessor.createJob(mockJobData)

      expect(jobId).toBe(mockJobData.id)
      expect(prisma.processingJob.create).toHaveBeenCalledWith({
        data: {
          id: mockJobData.id,
          userId: mockJobData.userId,
          fileName: mockJobData.fileName,
          fileSize: mockJobData.fileSize,
          status: ProcessingStatus.PENDING,
          currentStage: ProcessingStage.UPLOAD,
          progress: 0,
          metadata: mockJobData.metadata,
          retryCount: 0,
          maxRetries: 3,
        },
      })
      expect(prisma.processingNotification.create).toHaveBeenCalledWith({
        data: {
          userId: mockJobData.userId,
          jobId: mockJobData.id,
          type: 'JOB_CREATED',
          title: '업로드 시작',
          message: `${mockJobData.fileName} 파일 처리를 시작합니다.`,
        },
      })
    })
  })

  describe('getJobStatus', () => {
    it('should return job status with notifications', async () => {
      const mockJob = {
        id: 'test-job-1',
        status: ProcessingStatus.PROCESSING,
        progress: 50,
        notifications: [
          {
            id: 'notif-1',
            type: 'JOB_CREATED',
            title: '업로드 시작',
            message: 'test.pdf 파일 처리를 시작합니다.',
            createdAt: new Date(),
          },
        ],
      }

      ;(prisma.processingJob.findUnique as any).mockResolvedValue(mockJob)

      const result = await backgroundProcessor.getJobStatus('test-job-1')

      expect(result).toEqual(mockJob)
      expect(prisma.processingJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-job-1' },
        include: {
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
    })
  })

  describe('getUserJobs', () => {
    it('should return user jobs with latest notification', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          userId: 'user-1',
          fileName: 'test1.pdf',
          status: ProcessingStatus.COMPLETED,
          notifications: [
            {
              id: 'notif-1',
              type: 'JOB_COMPLETED',
              title: '처리 완료',
              message: '처리가 완료되었습니다.',
            },
          ],
        },
        {
          id: 'job-2',
          userId: 'user-1',
          fileName: 'test2.pdf',
          status: ProcessingStatus.PROCESSING,
          notifications: [
            {
              id: 'notif-2',
              type: 'JOB_CREATED',
              title: '업로드 시작',
              message: '파일 처리를 시작합니다.',
            },
          ],
        },
      ]

      ;(prisma.processingJob.findMany as any).mockResolvedValue(mockJobs)

      const result = await backgroundProcessor.getUserJobs('user-1', 10)

      expect(result).toEqual(mockJobs)
      expect(prisma.processingJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    })
  })

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      const mockJob = {
        id: 'test-job-1',
        userId: 'user-1',
        status: ProcessingStatus.PENDING,
      }

      ;(prisma.processingJob.findFirst as any).mockResolvedValue(mockJob)
      ;(prisma.processingJob.update as any).mockResolvedValue({})
      ;(prisma.processingNotification.create as any).mockResolvedValue({})

      const result = await backgroundProcessor.cancelJob('test-job-1', 'user-1')

      expect(result).toBe(true)
      expect(prisma.processingJob.update).toHaveBeenCalledWith({
        where: { id: 'test-job-1' },
        data: {
          status: ProcessingStatus.CANCELLED,
          completedAt: expect.any(Date),
        },
      })
      expect(prisma.processingNotification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          jobId: 'test-job-1',
          type: 'JOB_CANCELLED',
          title: '처리 취소',
          message: '파일 처리가 취소되었습니다.',
        },
      })
    })

    it('should not cancel a completed job', async () => {
      const mockJob = {
        id: 'test-job-1',
        userId: 'user-1',
        status: ProcessingStatus.COMPLETED,
      }

      ;(prisma.processingJob.findFirst as any).mockResolvedValue(mockJob)

      const result = await backgroundProcessor.cancelJob('test-job-1', 'user-1')

      expect(result).toBe(false)
      expect(prisma.processingJob.update).not.toHaveBeenCalled()
    })
  })

  describe('retryJob', () => {
    it('should retry a failed job', async () => {
      const mockJob = {
        id: 'test-job-1',
        userId: 'user-1',
        status: ProcessingStatus.FAILED,
      }

      ;(prisma.processingJob.findFirst as any).mockResolvedValue(mockJob)
      ;(prisma.processingJob.update as any).mockResolvedValue({})
      ;(prisma.processingNotification.create as any).mockResolvedValue({})

      const result = await backgroundProcessor.retryJob('test-job-1', 'user-1')

      expect(result).toBe(true)
      expect(prisma.processingJob.update).toHaveBeenCalledWith({
        where: { id: 'test-job-1' },
        data: {
          status: ProcessingStatus.PENDING,
          currentStage: ProcessingStage.UPLOAD,
          progress: 0,
          retryCount: 0,
          error: null,
        },
      })
      expect(prisma.processingNotification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          jobId: 'test-job-1',
          type: 'JOB_RETRY',
          title: '재시도 시작',
          message: '파일 처리를 다시 시작합니다.',
        },
      })
    })

    it('should not retry a non-failed job', async () => {
      const mockJob = {
        id: 'test-job-1',
        userId: 'user-1',
        status: ProcessingStatus.PROCESSING,
      }

      ;(prisma.processingJob.findFirst as any).mockResolvedValue(mockJob)

      const result = await backgroundProcessor.retryJob('test-job-1', 'user-1')

      expect(result).toBe(false)
      expect(prisma.processingJob.update).not.toHaveBeenCalled()
    })
  })

  describe('getNotifications', () => {
    it('should return user notifications with job info', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'JOB_COMPLETED',
          title: '처리 완료',
          message: '처리가 완료되었습니다.',
          isRead: false,
          createdAt: new Date(),
          job: {
            fileName: 'test.pdf',
            status: 'COMPLETED',
            progress: 100,
          },
        },
      ]

      ;(prisma.processingNotification.findMany as any).mockResolvedValue(mockNotifications)

      const result = await backgroundProcessor.getNotifications('user-1', 20)

      expect(result).toEqual(mockNotifications)
      expect(prisma.processingNotification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          job: {
            select: {
              fileName: true,
              status: true,
              progress: true,
            },
          },
        },
      })
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      ;(prisma.processingNotification.updateMany as any).mockResolvedValue({ count: 1 })

      const result = await backgroundProcessor.markNotificationAsRead('notif-1', 'user-1')

      expect(result).toBe(true)
      expect(prisma.processingNotification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      })
    })

    it('should return false if notification not found', async () => {
      ;(prisma.processingNotification.updateMany as any).mockResolvedValue({ count: 0 })

      const result = await backgroundProcessor.markNotificationAsRead('notif-1', 'user-1')

      expect(result).toBe(false)
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      ;(prisma.processingNotification.updateMany as any).mockResolvedValue({ count: 3 })

      const result = await backgroundProcessor.markAllNotificationsAsRead('user-1')

      expect(result).toBe(3)
      expect(prisma.processingNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      })
    })
  })
})