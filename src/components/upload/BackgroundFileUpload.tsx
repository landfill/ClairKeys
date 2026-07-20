'use client'

import { useState, useCallback } from 'react'
import { Button, Card } from '@/components/ui'
import FileUpload from './FileUpload'
import SheetMusicMetadataForm from './SheetMusicMetadataForm'
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing'
import { useCategories } from '@/hooks/useCategories'

export interface BackgroundUploadState {
  selectedFile: File | null
  metadata: {
    title: string
    composer: string
    categoryId: number | null
    isPublic: boolean
  }
  isSubmitting: boolean
  error: string | null
  success: boolean
  jobId: string | null
}

export default function BackgroundFileUpload() {
  const { createBackgroundJob } = useBackgroundProcessing()
  const { categories } = useCategories()

  const [state, setState] = useState<BackgroundUploadState>({
    selectedFile: null,
    metadata: {
      title: '',
      composer: '',
      categoryId: null,
      isPublic: false
    },
    isSubmitting: false,
    error: null,
    success: false,
    jobId: null
  })

  const handleFileSelect = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
      error: null,
      success: false,
      jobId: null
    }))
  }, [])

  const handleFileRemove = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFile: null,
      error: null,
      success: false,
      jobId: null
    }))
  }, [])

  const handleMetadataChange = useCallback((metadata: Partial<BackgroundUploadState['metadata']>) => {
    setState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        ...metadata
      }
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!state.selectedFile) {
      setState(prev => ({
        ...prev,
        error: '파일을 선택해주세요.'
      }))
      return
    }

    if (!state.metadata.title.trim()) {
      setState(prev => ({
        ...prev,
        error: '곡명을 입력해주세요.'
      }))
      return
    }

    if (!state.metadata.composer.trim()) {
      setState(prev => ({
        ...prev,
        error: '저작자를 입력해주세요.'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null
    }))

    try {
      const result = await createBackgroundJob(state.selectedFile, {
        title: state.metadata.title,
        composer: state.metadata.composer,
        categoryId: state.metadata.categoryId,
        isPublic: state.metadata.isPublic
      })

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        success: true,
        jobId: result.jobId
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
      }))
    }
  }, [state.selectedFile, state.metadata, createBackgroundJob])

  const handleReset = useCallback(() => {
    setState({
      selectedFile: null,
      metadata: {
        title: '',
        composer: '',
        categoryId: null,
        isPublic: false
      },
      isSubmitting: false,
      error: null,
      success: false,
      jobId: null
    })
  }, [])

  if (state.success && state.jobId) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-6">
          <div className="text-6xl">🚀</div>
          
          <div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              백그라운드 처리 시작!
            </h2>
            <p className="text-gray-600 mb-4">
              파일이 백그라운드에서 처리됩니다. 처리가 완료되면 알림을 받을 수 있습니다.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>작업 ID:</strong> {state.jobId}
              </p>
              <p className="text-blue-600 text-sm mt-1">
                처리 상태는 대시보드에서 실시간으로 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = '/processing'
              }}
            >
              처리 상태 보기
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
            >
              다른 파일 업로드
            </Button>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>💡 <strong>팁:</strong></p>
            <p>• 처리 시간은 파일 크기와 복잡도에 따라 달라집니다</p>
            <p>• 처리 중에도 다른 파일을 업로드할 수 있습니다</p>
            <p>• 처리가 완료되면 자동으로 알림을 받습니다</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          악보 업로드 (백그라운드 처리)
        </h1>
        <p className="text-gray-600">
          PDF 악보를 업로드하면 백그라운드에서 자동으로 처리됩니다
        </p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-red-800">{state.error}</p>
          </div>
        </div>
      )}

      {/* File Upload */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          1. PDF 파일 선택
        </h2>
        <FileUpload
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          selectedFile={state.selectedFile}
          isUploading={state.isSubmitting}
          error={state.error}
        />
      </Card>

      {/* Metadata Form */}
      {state.selectedFile && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2. 악보 정보 입력
          </h2>
          <SheetMusicMetadataForm
            formData={state.metadata}
            onChange={handleMetadataChange}
          />
        </Card>
      )}

      {/* Submit Button */}
      {state.selectedFile && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. 백그라운드 처리 시작
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 text-xl">ℹ️</span>
              <div className="text-blue-800 text-sm">
                <p className="font-semibold mb-2">백그라운드 처리 방식:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>파일이 즉시 업로드되고 백그라운드에서 처리됩니다</li>
                  <li>처리 중에도 다른 작업을 계속할 수 있습니다</li>
                  <li>처리 상태는 실시간으로 대시보드에서 확인 가능합니다</li>
                  <li>처리 완료 시 알림을 받습니다</li>
                  <li>처리 실패 시 자동으로 재시도됩니다</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={state.isSubmitting}
              className="flex-1"
            >
              {state.isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  백그라운드 처리 시작 중...
                </div>
              ) : (
                '백그라운드 처리 시작'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/processing'
              }}
            >
              처리 상태 보기
            </Button>
          </div>
        </Card>
      )}

      {/* Processing Info */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          처리 과정 안내
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { stage: '업로드', icon: '📤', desc: '파일 업로드' },
            { stage: 'PDF 파싱', icon: '📄', desc: 'PDF 내용 분석' },
            { stage: '악보 인식', icon: '🎵', desc: '음표 및 기호 인식' },
            { stage: '데이터 검증', icon: '✅', desc: '변환 데이터 검증' },
            { stage: '애니메이션 생성', icon: '🎹', desc: '피아노 애니메이션 생성' }
          ].map((step, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl mb-2">{step.icon}</div>
              <h4 className="font-medium text-gray-900 mb-1">{step.stage}</h4>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}