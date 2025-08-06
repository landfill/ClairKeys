'use client'

import { useState, useCallback } from 'react'
import FileUpload from './FileUpload'
import { ProcessStageIndicator } from './ProcessStageIndicator'
import { MusicThemeLoader } from './MusicThemeLoader'
import { ProcessingStatus } from './ProcessingStatus'

export type UploadStage = 
  | 'idle'
  | 'upload'
  | 'parsing' 
  | 'omr'
  | 'validation'
  | 'generation'
  | 'complete'
  | 'error'

export interface MultiStageUploadUIProps {
  onUploadComplete: (result: unknown) => void
  onError: (error: string) => void
  className?: string
}

export interface ProcessingInfo {
  stage: UploadStage
  progress: number
  message: string
  estimatedTime?: number
  startTime?: number
}

const STAGE_LABELS = {
  idle: '대기',
  upload: '파일 업로드',
  parsing: 'PDF 파싱',
  omr: '악보 인식 (OMR)',
  validation: '데이터 검증',
  generation: '애니메이션 생성',
  complete: '완료',
  error: '오류'
} as const

const STAGE_ESTIMATED_TIMES = {
  upload: 5,      // 5초
  parsing: 15,    // 15초
  omr: 45,        // 45초 (가장 오래 걸림)
  validation: 10, // 10초
  generation: 20, // 20초
} as const

export default function MultiStageUploadUI({
  onUploadComplete,
  onError,
  className = ''
}: MultiStageUploadUIProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo>({
    stage: 'idle',
    progress: 0,
    message: '파일을 선택하세요'
  })
  
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    categoryId: '',
    isPublic: false
  })

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setProcessingInfo({
      stage: 'idle',
      progress: 0,
      message: '메타데이터를 입력하고 업로드를 시작하세요'
    })
  }, [])

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setProcessingInfo({
      stage: 'idle',
      progress: 0,
      message: '파일을 선택하세요'
    })
  }, [])

  const startProcessing = useCallback(async () => {
    if (!selectedFile) return

    const startTime = Date.now()

    try {
      // Stage 1: Upload
      setProcessingInfo({
        stage: 'upload',
        progress: 0,
        message: '파일을 서버로 전송 중...',
        estimatedTime: STAGE_ESTIMATED_TIMES.upload,
        startTime
      })

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50))
        setProcessingInfo(prev => ({ ...prev, progress: i }))
      }

      // Stage 2: Parsing
      setProcessingInfo({
        stage: 'parsing',
        progress: 0,
        message: 'PDF 구조를 분석 중...',
        estimatedTime: STAGE_ESTIMATED_TIMES.parsing,
        startTime
      })

      // Create form data
      const formDataToSend = new FormData()
      formDataToSend.append('file', selectedFile)
      formDataToSend.append('title', formData.title)
      formDataToSend.append('composer', formData.composer)
      formDataToSend.append('category', formData.categoryId)
      formDataToSend.append('isPublic', formData.isPublic.toString())

      // Stage 3: OMR (Optical Music Recognition)
      setProcessingInfo({
        stage: 'omr',
        progress: 0,
        message: '악보를 인식하고 디지털 데이터로 변환 중...',
        estimatedTime: STAGE_ESTIMATED_TIMES.omr,
        startTime
      })

      // Simulate OMR progress (longest stage)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToSend
      })

      // Stage 4: Validation
      setProcessingInfo({
        stage: 'validation',
        progress: 0,
        message: '변환된 데이터의 정확성을 검증 중...',
        estimatedTime: STAGE_ESTIMATED_TIMES.validation,
        startTime
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '업로드 실패')
      }

      const result = await response.json()

      // Stage 5: Generation
      setProcessingInfo({
        stage: 'generation',
        progress: 0,
        message: '피아노 애니메이션 데이터를 생성 중...',
        estimatedTime: STAGE_ESTIMATED_TIMES.generation,
        startTime
      })

      // Simulate generation progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setProcessingInfo(prev => ({ ...prev, progress: i }))
      }

      // Complete
      setProcessingInfo({
        stage: 'complete',
        progress: 100,
        message: '업로드가 성공적으로 완료되었습니다!',
        startTime
      })

      onUploadComplete(result)

    } catch (error) {
      setProcessingInfo({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        startTime
      })
      onError(error instanceof Error ? error.message : '업로드 실패')
    }
  }, [selectedFile, formData, onUploadComplete, onError])

  const isProcessing = processingInfo.stage !== 'idle' && 
                      processingInfo.stage !== 'complete' && 
                      processingInfo.stage !== 'error'

  const canStartProcessing = selectedFile && 
                           formData.title.trim() && 
                           formData.composer.trim() && 
                           !isProcessing

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">1. 파일 선택</h2>
        <FileUpload
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          selectedFile={selectedFile}
          isUploading={isProcessing}
          error={processingInfo.stage === 'error' ? processingInfo.message : null}
        />
      </div>

      {/* Metadata Form */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">2. 악보 정보 입력</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                곡명 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="곡명을 입력하세요"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작곡가 *
              </label>
              <input
                type="text"
                value={formData.composer}
                onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="작곡가를 입력하세요"
                disabled={isProcessing}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                다른 사용자에게 공개
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Processing Section */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">3. 처리 과정</h2>
          
          <div className="space-y-6">
            {/* Stage Indicator */}
            <ProcessStageIndicator 
              currentStage={processingInfo.stage}
              stages={Object.keys(STAGE_LABELS) as UploadStage[]}
              stageLabels={STAGE_LABELS}
            />

            {/* Processing Status */}
            {(isProcessing || processingInfo.stage === 'complete') && (
              <div className="space-y-4">
                <ProcessingStatus processingInfo={processingInfo} />
                <MusicThemeLoader 
                  isActive={isProcessing} 
                  stage={processingInfo.stage}
                />
              </div>
            )}

            {/* Start Button */}
            {processingInfo.stage === 'idle' && (
              <button
                onClick={startProcessing}
                disabled={!canStartProcessing}
                className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
                  canStartProcessing
                    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                업로드 시작
              </button>
            )}

            {/* Retry Button */}
            {processingInfo.stage === 'error' && (
              <button
                onClick={() => {
                  setProcessingInfo({
                    stage: 'idle',
                    progress: 0,
                    message: '메타데이터를 입력하고 업로드를 시작하세요'
                  })
                }}
                className="w-full py-3 px-4 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}