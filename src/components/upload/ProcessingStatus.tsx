'use client'

import { useEffect, useState } from 'react'
import { ProcessingInfo } from './MultiStageUploadUI'

export interface ProcessingStatusProps {
  processingInfo: ProcessingInfo
}

export function ProcessingStatus({ processingInfo }: ProcessingStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!processingInfo.startTime || 
        processingInfo.stage === 'idle' || 
        processingInfo.stage === 'complete' || 
        processingInfo.stage === 'error') {
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - processingInfo.startTime!) / 1000)
      setElapsedTime(elapsed)

      // Calculate estimated remaining time
      if (processingInfo.estimatedTime && processingInfo.progress > 0) {
        const totalEstimated = processingInfo.estimatedTime
        const progressRatio = processingInfo.progress / 100
        const estimatedElapsedForStage = totalEstimated * progressRatio
        const remaining = Math.max(0, totalEstimated - estimatedElapsedForStage)
        setEstimatedRemaining(Math.ceil(remaining))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [processingInfo.startTime, processingInfo.stage, processingInfo.progress, processingInfo.estimatedTime])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`
  }

  const getProgressColor = () => {
    switch (processingInfo.stage) {
      case 'upload': return 'bg-blue-500'
      case 'parsing': return 'bg-purple-500'
      case 'omr': return 'bg-green-500'
      case 'validation': return 'bg-yellow-500'
      case 'generation': return 'bg-indigo-500'
      case 'complete': return 'bg-green-600'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            진행률
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {processingInfo.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
            style={{ width: `${processingInfo.progress}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-800 font-medium">
          {processingInfo.message}
        </p>
      </div>

      {/* Time Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {/* Elapsed Time */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-blue-600 font-semibold mb-1">경과 시간</div>
          <div className="text-blue-800 text-lg font-mono">
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Estimated Remaining */}
        {estimatedRemaining !== null && processingInfo.stage !== 'complete' && (
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-600 font-semibold mb-1">예상 남은 시간</div>
            <div className="text-orange-800 text-lg font-mono">
              {formatTime(estimatedRemaining)}
            </div>
          </div>
        )}

        {/* Total Progress */}
        {processingInfo.stage !== 'idle' && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-600 font-semibold mb-1">
              {processingInfo.stage === 'complete' ? '총 소요 시간' : '전체 진행률'}
            </div>
            <div className="text-green-800 text-lg font-mono">
              {processingInfo.stage === 'complete' 
                ? formatTime(elapsedTime)
                : `${Math.min(100, processingInfo.progress)}%`
              }
            </div>
          </div>
        )}
      </div>

      {/* Stage-specific tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-500 mt-0.5">💡</span>
          <div className="text-yellow-800 text-sm">
            {processingInfo.stage === 'upload' && '파일이 클수록 시간이 더 걸릴 수 있습니다.'}
            {processingInfo.stage === 'parsing' && 'PDF의 복잡성에 따라 처리 시간이 달라집니다.'}
            {processingInfo.stage === 'omr' && '이 단계가 가장 오래 걸립니다. 악보가 복잡할수록 시간이 더 소요됩니다.'}
            {processingInfo.stage === 'validation' && '변환된 데이터의 정확성을 확인하고 있습니다.'}
            {processingInfo.stage === 'generation' && '피아노 연주를 위한 애니메이션 데이터를 준비하고 있습니다.'}
            {processingInfo.stage === 'complete' && '이제 악보를 재생하고 연습할 수 있습니다!'}
            {processingInfo.stage === 'error' && '문제가 발생했습니다. 다른 PDF 파일로 시도해보세요.'}
          </div>
        </div>
      </div>
    </div>
  )
}