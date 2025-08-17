'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import { MultiStageUploadUI } from '@/components/upload'
import BackgroundFileUpload from '@/components/upload/BackgroundFileUpload'
import OMRUploadForm from '@/components/upload/OMRUploadForm'
import OMRProcessingStatus from '@/components/upload/OMRProcessingStatus'

interface ProcessingJob {
  sheetMusicId: number
  jobId: string
  title?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [uploadMode, setUploadMode] = useState<'omr' | 'background' | 'immediate'>('omr')
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])

  const handleUploadComplete = (result: unknown) => {
    console.log('Upload successful:', result)
    // Redirect to library page after successful upload
    setTimeout(() => {
      router.push('/library')
    }, 2000) // Wait 2 seconds to show success message
  }

  const handleError = (error: string) => {
    console.error('Upload failed:', error)
  }

  const handleOMRUploadStart = (data: { sheetMusicId: number; jobId: string }) => {
    // Add new job to processing list
    setProcessingJobs(prev => [
      ...prev,
      {
        sheetMusicId: data.sheetMusicId,
        jobId: data.jobId
      }
    ])
  }

  const handleOMRJobComplete = (sheetMusicId: number) => {
    // Remove completed job from processing list after a delay
    setTimeout(() => {
      setProcessingJobs(prev => prev.filter(job => job.sheetMusicId !== sheetMusicId))
    }, 3000) // Keep for 3 seconds to show success message
  }

  const handleOMRJobError = (jobId: string, error: string) => {
    console.error(`Job ${jobId} failed:`, error)
    // Keep failed jobs in the list so user can see the error
  }

  const handleOMRUploadError = (error: string) => {
    // Handle upload errors (not processing errors)
    console.error('Upload error:', error)
  }

  return (
    <AuthGuard>
      <MainLayout>
        <PageHeader
          title="악보 업로드"
          description="PDF 악보를 업로드하여 피아노 애니메이션으로 변환하세요"
        />
        
        <Container className="py-8" size="lg">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Upload Mode Selection */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                업로드 방식 선택
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setUploadMode('omr')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    uploadMode === 'omr'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🎼</span>
                    <h3 className="font-semibold text-gray-900">
                      OMR 처리 (NEW!)
                    </h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 실제 악보 인식</li>
                    <li>• 자동 변환</li>
                    <li>• 고품질 결과</li>
                    <li>• Fly.io 기반</li>
                  </ul>
                </button>

                <button
                  onClick={() => setUploadMode('background')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    uploadMode === 'background'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🚀</span>
                    <h3 className="font-semibold text-gray-900">
                      백그라운드 처리
                    </h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 논블로킹 업로드</li>
                    <li>• 다중 파일 처리 지원</li>
                    <li>• 실시간 상태 알림</li>
                    <li>• 자동 재시도</li>
                  </ul>
                </button>

                <button
                  onClick={() => setUploadMode('immediate')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    uploadMode === 'immediate'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">⚡</span>
                    <h3 className="font-semibold text-gray-900">
                      즉시 처리 (레거시)
                    </h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 즉시 결과 확인</li>
                    <li>• 단일 파일 처리</li>
                    <li>• 처리 완료까지 대기</li>
                    <li>• 기존 방식</li>
                  </ul>
                </button>
              </div>
            </Card>

            {/* OMR Upload Mode */}
            {uploadMode === 'omr' && (
              <>
                <OMRUploadForm 
                  onUploadStart={handleOMRUploadStart}
                  onUploadError={handleOMRUploadError}
                />
                
                {/* Processing Status */}
                {processingJobs.length > 0 && (
                  <OMRProcessingStatus
                    jobs={processingJobs}
                    onJobComplete={handleOMRJobComplete}
                    onJobError={handleOMRJobError}
                  />
                )}
              </>
            )}

            {/* Background Upload Mode */}
            {uploadMode === 'background' && <BackgroundFileUpload />}

            {/* Immediate Upload Mode */}
            {uploadMode === 'immediate' && (
              <MultiStageUploadUI
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            )}
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}