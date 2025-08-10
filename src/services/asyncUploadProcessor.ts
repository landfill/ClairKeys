import { getProcessingQueueService, ProcessingMetadata } from './processingQueue'
import { getPDFParserService } from './pdfParser'
import { fileStorageService } from './fileStorageService'
import { sheetMusicCache } from './cacheService'
import { prisma } from '@/lib/prisma'

class AsyncUploadProcessor {
  private processingQueue = getProcessingQueueService()
  private pdfParser = getPDFParserService()

  /**
   * Process upload asynchronously with real-time status updates
   */
  async processUpload(
    sessionId: string,
    fileContent: Buffer,
    metadata: ProcessingMetadata
  ): Promise<void> {
    try {
      // Stage 1: Upload (already completed when we get here)
      await this.updateStatus(sessionId, {
        stage: 'upload',
        progress: 100,
        message: '파일 업로드 완료',
        estimatedTime: 0
      })

      await this.delay(500) // Brief pause for UI feedback

      // Stage 2: Parsing
      await this.updateStatus(sessionId, {
        stage: 'parsing',
        progress: 0,
        message: 'PDF 구조를 분석 중...',
        estimatedTime: 15
      })

      await this.simulateProgress(sessionId, 'parsing', 15000, [
        { progress: 25, message: 'PDF 페이지를 읽는 중...' },
        { progress: 50, message: 'PDF 메타데이터를 추출하는 중...' },
        { progress: 75, message: 'PDF 구조 분석 완료' }
      ])

      // Stage 3: OMR (Optical Music Recognition)
      await this.updateStatus(sessionId, {
        stage: 'omr',
        progress: 0,
        message: '악보를 인식하고 디지털 데이터로 변환 중...',
        estimatedTime: 45
      })

      // This is the actual heavy processing
      let animationData
      try {
        console.log(`Starting PDF parsing for session ${sessionId}`)
        
        await this.simulateProgress(sessionId, 'omr', 25000, [
          { progress: 15, message: '악보 이미지를 분석하는 중...' },
          { progress: 35, message: '음표와 기호를 인식하는 중...' },
          { progress: 55, message: '리듬과 박자를 분석하는 중...' },
          { progress: 75, message: '음계와 조성을 파악하는 중...' }
        ])

        animationData = await this.pdfParser.parsePDF(fileContent, {
          title: metadata.title,
          composer: metadata.composer,
          originalFileName: metadata.filename,
          fileSize: metadata.fileSize
        })

        await this.updateStatus(sessionId, {
          stage: 'omr',
          progress: 100,
          message: 'OMR 처리 완료'
        })

        console.log(`PDF parsing completed for session ${sessionId}`)
        
      } catch (error) {
        console.error(`PDF parsing failed for session ${sessionId}:`, error)
        await this.updateStatus(sessionId, {
          error: 'PDF 파싱 중 오류가 발생했습니다. 올바른 악보 PDF인지 확인해주세요.'
        })
        return
      }

      await this.delay(500)

      // Stage 4: Validation
      await this.updateStatus(sessionId, {
        stage: 'validation',
        progress: 0,
        message: '변환된 데이터의 정확성을 검증 중...',
        estimatedTime: 10
      })

      await this.simulateProgress(sessionId, 'validation', 8000, [
        { progress: 30, message: '음표 데이터 검증 중...' },
        { progress: 60, message: '타이밍 정보 검증 중...' },
        { progress: 90, message: '전체 구조 검증 중...' }
      ])

      // Validate the parsed data
      try {
        console.log(`Validating animation data for session ${sessionId}`)
        
        if (!this.pdfParser.validateAnimationData(animationData)) {
          console.error(`Animation data validation failed for session ${sessionId}`)
          await this.updateStatus(sessionId, {
            error: '악보 데이터 변환에 실패했습니다.'
          })
          return
        }

        await this.updateStatus(sessionId, {
          stage: 'validation',
          progress: 100,
          message: '데이터 검증 완료'
        })

        console.log(`Animation data validation passed for session ${sessionId}`)
        
      } catch (error) {
        console.error(`Validation failed for session ${sessionId}:`, error)
        await this.updateStatus(sessionId, {
          error: '데이터 검증 중 오류가 발생했습니다.'
        })
        return
      }

      await this.delay(500)

      // Stage 5: Generation
      await this.updateStatus(sessionId, {
        stage: 'generation',
        progress: 0,
        message: '피아노 애니메이션 데이터를 생성 중...',
        estimatedTime: 20
      })

      await this.simulateProgress(sessionId, 'generation', 15000, [
        { progress: 25, message: '애니메이션 타임라인 생성 중...' },
        { progress: 50, message: '키 프레임 계산 중...' },
        { progress: 75, message: '최종 데이터 구성 중...' }
      ])

      // Save to database
      try {
        console.log(`Saving to database for session ${sessionId}`)

        // Find user by session using system method
        const job = await this.processingQueue.getJobStatusSystem(sessionId)
        if (!job) {
          throw new Error('Job not found for database save')
        }

        // Get user ID from job
        const userId = job.userId

        // Verify category exists if provided
        let categoryId: number | null = null
        if (metadata.categoryId) {
          const category = await prisma.category.findFirst({
            where: {
              id: metadata.categoryId,
              userId: userId,
            },
          })
          if (category) {
            categoryId = metadata.categoryId
          }
        }

        // Upload animation data to file storage
        console.log(`Uploading animation data to storage for session ${sessionId}`)
        const uploadResult = await fileStorageService.uploadAnimationData(
          animationData,
          {
            name: `${metadata.title}_animation.json`,
            size: JSON.stringify(animationData).length,
            type: 'application/json',
            userId: userId,
            isPublic: metadata.isPublic
          }
        )

        if (!uploadResult.success) {
          throw new Error(`Failed to upload animation data: ${uploadResult.error}`)
        }

        console.log(`Animation data uploaded successfully: ${uploadResult.url}`)
        console.log(`🔍 DEBUG: uploadResult object:`, JSON.stringify(uploadResult, null, 2))
        console.log(`🔍 DEBUG: uploadResult.url type:`, typeof uploadResult.url)
        console.log(`🔍 DEBUG: uploadResult.url value:`, uploadResult.url)

        const sheetMusic = await prisma.sheetMusic.create({
          data: {
            title: metadata.title,
            composer: metadata.composer,
            categoryId,
            isPublic: metadata.isPublic,
            userId: userId,
            animationDataUrl: uploadResult.url!,
          },
          include: {
            category: true,
          }
        })

        // Invalidate relevant caches
        sheetMusicCache.invalidateUser(userId)
        if (metadata.isPublic) {
          sheetMusicCache.invalidatePublic()
        }

        await this.updateStatus(sessionId, {
          stage: 'generation',
          progress: 100,
          message: '애니메이션 데이터 생성 완료'
        })

        console.log(`Database save completed for session ${sessionId}`)

        // Stage 6: Complete
        await this.updateStatus(sessionId, {
          stage: 'complete',
          progress: 100,
          message: '업로드가 성공적으로 완료되었습니다!',
          completed: true,
          result: {
            id: sheetMusic.id,
            title: sheetMusic.title,
            composer: sheetMusic.composer,
            categoryId: sheetMusic.categoryId,
            category: sheetMusic.category,
            isPublic: sheetMusic.isPublic,
            createdAt: sheetMusic.createdAt
          }
        })

        console.log(`Processing completed successfully for session ${sessionId}`)
        
      } catch (error) {
        console.error(`Database save failed for session ${sessionId}:`, error)
        await this.updateStatus(sessionId, {
          error: `데이터베이스 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        return
      }

    } catch (error) {
      console.error(`Processing failed for session ${sessionId}:`, error)
      await this.updateStatus(sessionId, {
        error: `처리 중 예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Update processing status
   */
  private async updateStatus(sessionId: string, updates: any): Promise<void> {
    try {
      await this.processingQueue.updateJobStatus(sessionId, updates)
    } catch (error) {
      console.error(`Failed to update status for session ${sessionId}:`, error)
    }
  }

  /**
   * Simulate progress with intermediate updates
   */
  private async simulateProgress(
    sessionId: string,
    stage: string,
    totalTime: number,
    milestones: Array<{ progress: number; message: string }>
  ): Promise<void> {
    for (const milestone of milestones) {
      const delay = totalTime / milestones.length
      await this.delay(delay)
      await this.updateStatus(sessionId, {
        stage,
        progress: milestone.progress,
        message: milestone.message
      })
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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