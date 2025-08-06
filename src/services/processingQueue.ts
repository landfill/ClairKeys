import { v4 as uuidv4 } from 'uuid'

export type ProcessingStage = 
  | 'queued'
  | 'upload'
  | 'parsing'
  | 'omr'
  | 'validation'
  | 'generation'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface ProcessingJob {
  sessionId: string
  userId: string
  stage: ProcessingStage
  progress: number
  message: string
  estimatedTime?: number
  startTime: number
  endTime?: number
  error?: string
  completed: boolean
  cancelled: boolean
  result?: any
  metadata: {
    filename: string
    fileSize: number
    title: string
    composer: string
    categoryId?: number
    isPublic: boolean
  }
}

export interface ProcessingMetadata {
  filename: string
  fileSize: number
  title: string
  composer: string
  categoryId?: number
  isPublic: boolean
}

class ProcessingQueueService {
  private jobs = new Map<string, ProcessingJob>()
  private userJobs = new Map<string, Set<string>>() // userId -> sessionIds
  private jobTimeouts = new Map<string, NodeJS.Timeout>()

  constructor() {
    // Cleanup old jobs every hour
    setInterval(() => {
      this.cleanupOldJobs()
    }, 60 * 60 * 1000)
  }

  /**
   * Create a new processing job
   */
  async createJob(
    userId: string,
    metadata: ProcessingMetadata
  ): Promise<string> {
    const sessionId = uuidv4()
    const now = Date.now()

    const job: ProcessingJob = {
      sessionId,
      userId,
      stage: 'queued',
      progress: 0,
      message: '처리 대기 중...',
      startTime: now,
      completed: false,
      cancelled: false,
      metadata
    }

    this.jobs.set(sessionId, job)
    
    // Track user jobs
    if (!this.userJobs.has(userId)) {
      this.userJobs.set(userId, new Set())
    }
    this.userJobs.get(userId)!.add(sessionId)

    // Set timeout for job cleanup (24 hours)
    const timeout = setTimeout(() => {
      this.removeJob(sessionId)
    }, 24 * 60 * 60 * 1000)
    
    this.jobTimeouts.set(sessionId, timeout)

    console.log(`Created processing job: ${sessionId} for user: ${userId}`)
    return sessionId
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    sessionId: string,
    updates: Partial<Pick<ProcessingJob, 'stage' | 'progress' | 'message' | 'estimatedTime' | 'error' | 'completed' | 'result'>>
  ): Promise<boolean> {
    const job = this.jobs.get(sessionId)
    if (!job) {
      console.error(`Job not found: ${sessionId}`)
      return false
    }

    // Update job properties
    Object.assign(job, updates)

    // Set end time if completed or error
    if (updates.completed || updates.error) {
      job.endTime = Date.now()
    }

    console.log(`Updated job ${sessionId}:`, {
      stage: job.stage,
      progress: job.progress,
      message: job.message
    })

    return true
  }

  /**
   * Get job status
   */
  async getJobStatus(sessionId: string, userId: string): Promise<ProcessingJob | null> {
    const job = this.jobs.get(sessionId)
    
    if (!job) {
      return null
    }

    // Verify ownership
    if (job.userId !== userId) {
      console.warn(`Unauthorized access to job ${sessionId} by user ${userId}`)
      return null
    }

    return { ...job } // Return copy
  }

  /**
   * Cancel a job
   */
  async cancelJob(sessionId: string, userId: string): Promise<boolean> {
    const job = this.jobs.get(sessionId)
    
    if (!job) {
      return false
    }

    // Verify ownership
    if (job.userId !== userId) {
      console.warn(`Unauthorized cancel attempt for job ${sessionId} by user ${userId}`)
      return false
    }

    // Can't cancel completed jobs
    if (job.completed) {
      return false
    }

    job.cancelled = true
    job.stage = 'cancelled'
    job.message = '사용자에 의해 취소됨'
    job.endTime = Date.now()

    console.log(`Cancelled job: ${sessionId}`)
    return true
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string): Promise<ProcessingJob[]> {
    const sessionIds = this.userJobs.get(userId)
    if (!sessionIds) {
      return []
    }

    const jobs: ProcessingJob[] = []
    for (const sessionId of sessionIds) {
      const job = this.jobs.get(sessionId)
      if (job) {
        jobs.push({ ...job })
      }
    }

    // Sort by start time (newest first)
    return jobs.sort((a, b) => b.startTime - a.startTime)
  }

  /**
   * Remove a job from the queue
   */
  private removeJob(sessionId: string): void {
    const job = this.jobs.get(sessionId)
    if (!job) return

    // Remove from user tracking
    const userSessionIds = this.userJobs.get(job.userId)
    if (userSessionIds) {
      userSessionIds.delete(sessionId)
      if (userSessionIds.size === 0) {
        this.userJobs.delete(job.userId)
      }
    }

    // Clear timeout
    const timeout = this.jobTimeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.jobTimeouts.delete(sessionId)
    }

    // Remove job
    this.jobs.delete(sessionId)
    console.log(`Removed job: ${sessionId}`)
  }

  /**
   * Cleanup old completed jobs (older than 24 hours)
   */
  private cleanupOldJobs(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    let cleanedCount = 0
    for (const [sessionId, job] of this.jobs) {
      const age = now - job.startTime
      const shouldCleanup = age > maxAge && (job.completed || job.cancelled || job.error)

      if (shouldCleanup) {
        this.removeJob(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old jobs`)
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      totalJobs: this.jobs.size,
      activeJobs: 0,
      completedJobs: 0,
      errorJobs: 0,
      cancelledJobs: 0,
      queuedJobs: 0
    }

    for (const job of this.jobs.values()) {
      if (job.cancelled) {
        stats.cancelledJobs++
      } else if (job.error) {
        stats.errorJobs++
      } else if (job.completed) {
        stats.completedJobs++
      } else if (job.stage === 'queued') {
        stats.queuedJobs++
      } else {
        stats.activeJobs++
      }
    }

    return stats
  }
}

// Singleton instance
let processingQueueService: ProcessingQueueService | null = null

export function getProcessingQueueService(): ProcessingQueueService {
  if (!processingQueueService) {
    processingQueueService = new ProcessingQueueService()
  }
  return processingQueueService
}