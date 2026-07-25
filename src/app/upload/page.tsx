'use client'

import { useState } from 'react'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import AuthGuard from '@/components/auth/AuthGuard'
import OMRUploadForm from '@/components/upload/OMRUploadForm'
import OMRProcessingStatus from '@/components/upload/OMRProcessingStatus'

interface ProcessingJob {
  sheetMusicId: number
  jobId: string
  title?: string
}

export default function UploadPage() {
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])

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
          {/*
            One upload path. The "백그라운드 처리" and "즉시 처리" modes that used
            to sit beside this one produced a melody chosen by PDF file size,
            not by reading the score, and stored it as a real result — see D-010.
          */}
          <div className="max-w-4xl mx-auto space-y-6">
            <OMRUploadForm
              onUploadStart={handleOMRUploadStart}
              onUploadError={handleOMRUploadError}
            />

            {processingJobs.length > 0 && (
              <OMRProcessingStatus
                jobs={processingJobs}
                onJobComplete={handleOMRJobComplete}
                onJobError={handleOMRJobError}
              />
            )}
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
