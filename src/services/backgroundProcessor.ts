import { prisma } from '@/lib/prisma'
import { getPDFParserService } from './pdfParser'
import { ProcessingStatus, ProcessingStage } from '@prisma/client'

export interface ProcessingJobData {
  id: string
  userId: string
  fileName: string
  fileSize: number
  fileBuffer: Buffer
  metadata: {
    title: string
    composer: string
    categoryId?: number | null
    isPublic: boolean
  }
}

export interface ProcessingResult {
  sheetMusicId?: number
  animationData?: any
  error?: string
}

class BackgroundProcessor {
  private processingQueue: Map<string, ProcessingJobData> = new Map()
  private isProcessing = false

  async createJob(jobData: ProcessingJobData): Promise<string> {
    // Create job record in database
    const job = await prisma.processingJob.create({
      data: {
        id: jobData.id,
        userId: jobData.userId,
        fileName: jobData.fileName,
        fileSize: jobData.fileSize,
        status: ProcessingStatus.PENDING,
        currentStage: ProcessingStage.UPLOAD,
        progress: 0,
        metadata: jobData.metadata,
        retryCount: 0,
        maxRetries: 3,
      }
    })

    // Add to processing queue
    this.processingQueue.set(jobData.id, jobData)

    // Create notification
    await this.createNotification(
      jobData.userId,
      jobData.id,
      'JOB_CREATED',
      '업로드 시작',
      `${jobData.fileName} 파일 처리를 시작합니다.`
    )

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return job.id
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      while (this.processingQueue.size > 0) {
        const entry = this.processingQueue.entries().next().value
        if (!entry) break
        
        const [jobId, jobData] = entry
        this.processingQueue.delete(jobId)

        await this.processJob(jobData)
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(jobData: ProcessingJobData): Promise<void> {
    const { id: jobId, userId, fileBuffer, metadata } = jobData

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.PARSING, 10)

      // Stage 1: PDF Parsing
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.PARSING, 20)
      
      const pdfParser = getPDFParserService()
      let animationData

      try {
        animationData = await pdfParser.parsePDF(fileBuffer, {
          title: metadata.title,
          composer: metadata.composer,
          originalFileName: jobData.fileName,
          fileSize: jobData.fileSize
        })
      } catch (error) {
        throw new Error(`PDF 파싱 실패: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Stage 2: OMR (Optical Music Recognition) - Simulated
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.OMR, 40)
      await this.simulateProcessingDelay(1000) // Simulate OMR processing

      // Stage 3: Validation
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.VALIDATION, 60)
      
      if (!pdfParser.validateAnimationData(animationData)) {
        throw new Error('악보 데이터 검증 실패')
      }

      // Stage 4: Animation Data Generation
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.GENERATION, 80)
      
      const serializedData = pdfParser.serializeAnimationData(animationData)

      // Stage 5: Save to database
      await this.updateJobStatus(jobId, ProcessingStatus.PROCESSING, ProcessingStage.GENERATION, 90)

      const sheetMusic = await prisma.sheetMusic.create({
        data: {
          title: metadata.title,
          composer: metadata.composer,
          categoryId: metadata.categoryId,
          isPublic: metadata.isPublic,
          userId: userId,
          animationDataUrl: serializedData,
        },
        include: {
          category: true,
        }
      })

      // Complete the job
      await this.updateJobStatus(jobId, ProcessingStatus.COMPLETED, ProcessingStage.GENERATION, 100)
      
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          result: {
            sheetMusicId: sheetMusic.id,
            sheetMusic: {
              id: sheetMusic.id,
              title: sheetMusic.title,
              composer: sheetMusic.composer,
              categoryId: sheetMusic.categoryId,
              category: sheetMusic.category,
              isPublic: sheetMusic.isPublic,
              createdAt: sheetMusic.createdAt
            }
          },
          completedAt: new Date(),
        }
      })

      // Create success notification
      await this.createNotification(
        userId,
        jobId,
        'JOB_COMPLETED',
        '처리 완료',
        `${metadata.title} 악보 처리가 완료되었습니다.`
      )

    } catch (error) {
      await this.handleJobError(jobId, userId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async handleJobError(jobId: string, userId: string, errorMessage: string): Promise<void> {
    const job = await prisma.processingJob.findUnique({
      where: { id: jobId }
    })

    if (!job) return

    const shouldRetry = job.retryCount < job.maxRetries
    
    if (shouldRetry) {
      // Retry the job
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingStatus.PENDING,
          currentStage: ProcessingStage.UPLOAD,
          progress: 0,
          retryCount: job.retryCount + 1,
          error: errorMessage,
        }
      })

      // Create retry notification
      await this.createNotification(
        userId,
        jobId,
        'JOB_RETRY',
        '재시도 중',
        `처리 중 오류가 발생하여 재시도합니다. (${job.retryCount + 1}/${job.maxRetries})`
      )

      // Add back to queue for retry
      const jobData = this.processingQueue.get(jobId)
      if (jobData) {
        setTimeout(() => {
          this.processingQueue.set(jobId, jobData)
          if (!this.isProcessing) {
            this.processQueue()
          }
        }, 5000) // Retry after 5 seconds
      }
    } else {
      // Mark as failed
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingStatus.FAILED,
          error: errorMessage,
          completedAt: new Date(),
        }
      })

      // Create failure notification
      await this.createNotification(
        userId,
        jobId,
        'JOB_FAILED',
        '처리 실패',
        `파일 처리에 실패했습니다: ${errorMessage}`
      )
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: ProcessingStatus,
    stage: ProcessingStage,
    progress: number
  ): Promise<void> {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status,
        currentStage: stage,
        progress,
        startedAt: status === ProcessingStatus.PROCESSING ? new Date() : undefined,
      }
    })
  }

  private async createNotification(
    userId: string,
    jobId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    await prisma.processingNotification.create({
      data: {
        userId,
        jobId,
        type,
        title,
        message,
      }
    })
  }

  private async simulateProcessingDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getJobStatus(jobId: string): Promise<any> {
    return await prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })
  }

  async getUserJobs(userId: string, limit = 10): Promise<any[]> {
    return await prisma.processingJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
  }

  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const job = await prisma.processingJob.findFirst({
      where: { id: jobId, userId }
    })

    if (!job || job.status === ProcessingStatus.COMPLETED) {
      return false
    }

    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingStatus.CANCELLED,
        completedAt: new Date(),
      }
    })

    // Remove from queue if pending
    this.processingQueue.delete(jobId)

    // Create cancellation notification
    await this.createNotification(
      userId,
      jobId,
      'JOB_CANCELLED',
      '처리 취소',
      '파일 처리가 취소되었습니다.'
    )

    return true
  }

  async retryJob(jobId: string, userId: string): Promise<boolean> {
    const job = await prisma.processingJob.findFirst({
      where: { id: jobId, userId }
    })

    if (!job || job.status !== ProcessingStatus.FAILED) {
      return false
    }

    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingStatus.PENDING,
        currentStage: ProcessingStage.UPLOAD,
        progress: 0,
        retryCount: 0,
        error: null,
      }
    })

    // Create retry notification
    await this.createNotification(
      userId,
      jobId,
      'JOB_RETRY',
      '재시도 시작',
      '파일 처리를 다시 시작합니다.'
    )

    return true
  }

  async getNotifications(userId: string, limit = 20): Promise<any[]> {
    return await prisma.processingNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        job: {
          select: {
            fileName: true,
            status: true,
            progress: true,
          }
        }
      }
    })
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.processingNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    })

    return result.count > 0
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await prisma.processingNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    })

    return result.count
  }
}

// Singleton instance
const backgroundProcessor = new BackgroundProcessor()
export default backgroundProcessor