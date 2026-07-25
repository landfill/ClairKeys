import { prisma } from '@/lib/prisma'
import { CONVERSION_UNAVAILABLE, CONVERSION_UNAVAILABLE_MESSAGE } from './conversionAvailability'
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
  animationData?: unknown
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

  /**
   * Fail a queued job explicitly instead of fabricating a score.
   *
   * This method used to parse the PDF with `pdfParser` — which picks a canned
   * melody by file size and never reads the score — simulate an OMR stage with
   * a 1-second delay, and store the result as a real `SheetMusic` row. D-010
   * removed that; the queue and notification machinery stay for P1-B.
   *
   * It deliberately bypasses `handleJobError`. That path retries up to
   * `maxRetries`, and no number of retries makes a converter appear here.
   */
  private async processJob(jobData: ProcessingJobData): Promise<void> {
    const { id: jobId, userId, metadata } = jobData

    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingStatus.FAILED,
          error: `${CONVERSION_UNAVAILABLE}: ${CONVERSION_UNAVAILABLE_MESSAGE}`,
          completedAt: new Date(),
        }
      })

      await this.createNotification(
        userId,
        jobId,
        'JOB_FAILED',
        '처리 실패',
        `${metadata.title}: ${CONVERSION_UNAVAILABLE_MESSAGE}`
      )
    } catch (error) {
      console.error(`Failed to record conversion failure for job ${jobId}:`, error)
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

  async getJobStatus(jobId: string) {
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

  async getUserJobs(userId: string, limit = 10) {
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

    // A conversion that is unavailable does not become available on retry.
    // Worse, this path cannot deliver on the attempt: it resets the row to
    // PENDING but the in-memory `processingQueue` no longer holds the job's
    // `ProcessingJobData`, so `processQueue` has nothing to run and the job
    // would sit at 0% indefinitely. Refusing keeps the failure visible.
    if (job.error?.startsWith(CONVERSION_UNAVAILABLE)) {
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

  async getNotifications(userId: string, limit = 20) {
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