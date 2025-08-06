'use client'

import { useState, useCallback, useEffect } from 'react'
import FileUpload from './FileUpload'
import { ProcessStageIndicator } from './ProcessStageIndicator'
import { MusicThemeLoader } from './MusicThemeLoader'
import { ProcessingStatus } from './ProcessingStatus'
import { useRealTimeProcessing } from '@/hooks/useRealTimeProcessing'

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

  // Real-time processing hook
  const {
    status: realTimeStatus,
    isConnected,
    error: connectionError,
    startProcessing,
    cancelProcessing,
    reconnect
  } = useRealTimeProcessing({
    onComplete: (result) => {
      console.log('Real-time processing completed:', result)
      onUploadComplete(result)
    },
    onError: (error) => {
      console.error('Real-time processing error:', error)
      setProcessingInfo(prev => ({
        ...prev,
        stage: 'error',
        message: error
      }))
      onError(error)
    },
    onStageChange: (stage) => {
      console.log('Stage changed to:', stage)
    }
  })

  // Update processing info from real-time status
  useEffect(() => {
    if (realTimeStatus) {
      setProcessingInfo({
        stage: realTimeStatus.stage as UploadStage,
        progress: realTimeStatus.progress,
        message: realTimeStatus.message,
        estimatedTime: realTimeStatus.estimatedTime,
        startTime: realTimeStatus.startTime
      })
    }
  }, [realTimeStatus])

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

  const startProcessingHandler = useCallback(async () => {
    if (!selectedFile) return

    try {
      const metadata = {
        title: formData.title,
        composer: formData.composer,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
        isPublic: formData.isPublic
      }

      await startProcessing(selectedFile, metadata)
    } catch (error) {
      console.error('Failed to start processing:', error)
      setProcessingInfo({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '처리 시작 실패',
        startTime: Date.now()
      })
    }
  }, [selectedFile, formData, startProcessing])

  const cancelProcessingHandler = useCallback(async () => {
    try {
      await cancelProcessing()
      setProcessingInfo({
        stage: 'idle',
        progress: 0,
        message: '파일을 선택하세요'
      })
    } catch (error) {
      console.error('Failed to cancel processing:', error)
    }
  }, [cancelProcessing])

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

            {/* Connection Status */}
            {connectionError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-yellow-800 text-sm">연결 문제: {connectionError}</span>
                  </div>
                  <button
                    onClick={reconnect}
                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    다시 연결
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Connection Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-gray-600">
                  {isConnected ? '실시간 연결됨' : '폴링 모드'}
                </span>
              </div>
            )}

            {/* Start Button */}
            {processingInfo.stage === 'idle' && (
              <button
                onClick={startProcessingHandler}
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

            {/* Cancel Button */}
            {isProcessing && (
              <button
                onClick={cancelProcessingHandler}
                className="w-full py-3 px-4 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                업로드 취소
              </button>
            )}

            {/* Retry Button */}
            {processingInfo.stage === 'error' && (
              <div className="space-y-2">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}