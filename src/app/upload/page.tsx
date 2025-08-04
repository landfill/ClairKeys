'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import FileUpload from '@/components/upload/FileUpload'
import SheetMusicMetadataForm, { type SheetMusicFormData } from '@/components/upload/SheetMusicMetadataForm'
import { useFileUpload } from '@/hooks/useFileUpload'

export default function UploadPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState<SheetMusicFormData>({
    title: '',
    composer: '',
    categoryId: null,
    isPublic: false
  })

  const { uploadState, uploadFile, resetUpload } = useFileUpload({
    onSuccess: (result) => {
      console.log('Upload successful:', result)
      // Redirect to the uploaded sheet music page or library
      router.push('/library')
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    }
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    resetUpload() // Reset any previous upload state
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    resetUpload()
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    // Convert form data to the format expected by useFileUpload
    const uploadMetadata = {
      title: formData.title,
      composer: formData.composer,
      categoryId: formData.categoryId,
      isPublic: formData.isPublic
    }

    try {
      await uploadFile(selectedFile, uploadMetadata)
      
      // Redirect to library page after successful upload
      setTimeout(() => {
        router.push('/library')
      }, 2000) // Wait 2 seconds to show success message
    } catch (error) {
      console.error('Upload failed:', error)
    }
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
        
        <Container className="py-8" size="md">
          <div className="space-y-8">
            {/* File Upload Area */}
            <Card padding="lg">
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={selectedFile}
                isUploading={uploadState.isUploading}
                uploadProgress={uploadState.progress}
                error={uploadState.error}
              />
            </Card>

            {/* Metadata Form */}
            <Card padding="lg">
              <SheetMusicMetadataForm
                formData={formData}
                onChange={setFormData}
                isSubmitting={uploadState.isUploading}
              />
            </Card>

            {/* Upload Status */}
            {uploadState.success && (
              <Card padding="lg">
                <div className="text-center text-green-600">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold mb-2">업로드 완료!</h3>
                  <p>악보가 성공적으로 업로드되었습니다. 라이브러리로 이동합니다...</p>
                </div>
              </Card>
            )}

            {/* Upload Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={
                  !selectedFile || 
                  !formData.title.trim() || 
                  !formData.composer.trim() || 
                  uploadState.isUploading
                }
                onClick={handleUpload}
                className="px-8"
              >
                {uploadState.isUploading ? '업로드 중...' : '업로드 시작'}
              </Button>
            </div>
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}