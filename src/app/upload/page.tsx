'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import { MultiStageUploadUI } from '@/components/upload'
import { useFileUpload } from '@/hooks/useFileUpload'

export default function UploadPage() {
  const router = useRouter()

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

  return (
    <AuthGuard>
      <MainLayout>
        <PageHeader
          title="악보 업로드"
          description="PDF 악보를 업로드하여 피아노 애니메이션으로 변환하세요"
          breadcrumbs={[
            { label: '홈', href: '/' },
            { label: '악보 업로드' }
          ]}
        />
        
        <Container className="py-8" size="lg">
          <MultiStageUploadUI
            onUploadComplete={handleUploadComplete}
            onError={handleError}
            className="max-w-4xl mx-auto"
          />
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}