'use client'

import { UploadStage } from './MultiStageUploadUI'

export interface ProcessStageIndicatorProps {
  currentStage: UploadStage
  stages: UploadStage[]
  stageLabels: Record<UploadStage, string>
}

const STAGE_ICONS = {
  idle: '⚪',
  upload: '⬆️',
  parsing: '📄',
  omr: '🎼',
  validation: '✅',
  generation: '🎹',
  complete: '✨',
  error: '❌'
} as const

export function ProcessStageIndicator({
  currentStage,
  stages,
  stageLabels
}: ProcessStageIndicatorProps) {
  const getStageStatus = (stage: UploadStage) => {
    const stageOrder = ['idle', 'upload', 'parsing', 'omr', 'validation', 'generation', 'complete']
    const currentIndex = stageOrder.indexOf(currentStage)
    const stageIndex = stageOrder.indexOf(stage)

    if (stage === 'error') {
      return currentStage === 'error' ? 'error' : 'pending'
    }

    if (stage === 'idle') {
      return currentStage === 'idle' ? 'current' : 'completed'
    }

    if (stageIndex < currentIndex || currentStage === 'complete') {
      return 'completed'
    } else if (stageIndex === currentIndex) {
      return 'current'
    } else {
      return 'pending'
    }
  }

  const getStageClasses = (stage: UploadStage) => {
    const status = getStageStatus(stage)
    
    const baseClasses = "flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300"
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 border-2 border-green-500`
      case 'current':
        return `${baseClasses} bg-blue-100 text-blue-800 border-2 border-blue-500 animate-pulse`
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800 border-2 border-red-500`
      default:
        return `${baseClasses} bg-gray-100 text-gray-500 border-2 border-gray-300`
    }
  }

  const getConnectorClasses = (fromStage: UploadStage, _toStage: UploadStage) => {
    const fromStatus = getStageStatus(fromStage)

    if (fromStatus === 'completed' || fromStatus === 'current') {
      return "h-1 bg-gradient-to-r from-green-500 to-blue-500"
    } else {
      return "h-1 bg-gray-300"
    }
  }

  // Filter out idle and error stages for display
  const displayStages = stages.filter(stage => stage !== 'idle' && stage !== 'error')

  return (
    <div className="w-full">
      {/* Stage Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {displayStages.map((stage, index) => (
          <div key={stage} className="flex items-center flex-1">
            {/* Stage Circle */}
            <div className="flex flex-col items-center">
              <div className={getStageClasses(stage)}>
                <span>{STAGE_ICONS[stage]}</span>
              </div>
              <div className="mt-2 text-xs font-medium text-center min-w-0 max-w-20">
                <div className={`${
                  getStageStatus(stage) === 'current' ? 'text-blue-600 font-semibold' :
                  getStageStatus(stage) === 'completed' ? 'text-green-600' :
                  getStageStatus(stage) === 'error' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {stageLabels[stage]}
                </div>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < displayStages.length - 1 && (
              <div className="flex-1 mx-4">
                <div className={getConnectorClasses(stage, displayStages[index + 1])} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Stage Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{STAGE_ICONS[currentStage]}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {stageLabels[currentStage]}
            </h3>
            <p className="text-sm text-gray-600">
              {currentStage === 'idle' && '파일을 선택하고 정보를 입력하세요'}
              {currentStage === 'upload' && '파일을 서버로 전송하고 있습니다'}
              {currentStage === 'parsing' && 'PDF 파일의 구조와 내용을 분석하고 있습니다'}
              {currentStage === 'omr' && '악보 이미지를 디지털 음악 데이터로 변환하고 있습니다 (가장 오래 걸리는 단계입니다)'}
              {currentStage === 'validation' && '변환된 데이터의 정확성과 완전성을 검증하고 있습니다'}
              {currentStage === 'generation' && '피아노 애니메이션 재생을 위한 데이터를 생성하고 있습니다'}
              {currentStage === 'complete' && '모든 처리가 완료되었습니다!'}
              {currentStage === 'error' && '처리 중 오류가 발생했습니다. 다시 시도해주세요'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}