import { getProcessingQueueService, ProcessingJob, ProcessingMetadata } from './processingQueue'
import { CONVERSION_UNAVAILABLE, CONVERSION_UNAVAILABLE_MESSAGE } from './conversionAvailability'

class AsyncUploadProcessor {
  private processingQueue = getProcessingQueueService()

  /**
   * Fail an upload explicitly instead of fabricating a score.
   *
   * This method used to run six staged progress updates — including 25
   * seconds of invented `omr` progress for a stage that never ran — and then
   * store `pdfParser`'s canned melody as a real `SheetMusic` row. D-010
   * removed that. The job now ends in an error the caller can see, and no row
   * is written.
   *
   * The signature and the queue's status contract are unchanged so P1-B can
   * build a durable queue on top of this seam.
   */
  async processUpload(
    sessionId: string,
    _fileContent: Buffer,
    _metadata: ProcessingMetadata
  ): Promise<void> {
    try {
      await this.updateStatus(sessionId, {
        stage: 'upload',
        progress: 100,
        message: '파일 업로드 완료',
        estimatedTime: 0
      })

      await this.updateStatus(sessionId, {
        error: `${CONVERSION_UNAVAILABLE}: ${CONVERSION_UNAVAILABLE_MESSAGE}`
      })
    } catch (error) {
      console.error(`Failed to record conversion failure for session ${sessionId}:`, error)
    }
  }

  /**
   * Update processing status
   */
  private async updateStatus(sessionId: string, updates: Partial<Pick<ProcessingJob, 'stage' | 'progress' | 'message' | 'estimatedTime' | 'error' | 'completed' | 'result'>>): Promise<void> {
    try {
      await this.processingQueue.updateJobStatus(sessionId, updates)
    } catch (error) {
      console.error(`Failed to update status for session ${sessionId}:`, error)
    }
  }

}

// Singleton instance
let asyncUploadProcessor: AsyncUploadProcessor | null = null

export function getAsyncUploadProcessor(): AsyncUploadProcessor {
  if (!asyncUploadProcessor) {
    asyncUploadProcessor = new AsyncUploadProcessor()
  }
  return asyncUploadProcessor
}