'use client'

import { Button } from '@/components/ui'
import { PracticeState, PianoNote } from '@/types/animation'

interface PracticeGuideControlsProps {
  practiceState: PracticeState | null
  isReady: boolean
  onStartPractice: (startTempo?: number, targetTempo?: number) => void
  onNextStep: () => void
  onExitPractice: () => void
  onToggleTempoProgression: (enabled: boolean, increment?: number) => void
  className?: string
}

export default function PracticeGuideControls({
  practiceState,
  isReady,
  onStartPractice,
  onNextStep,
  onExitPractice,
  onToggleTempoProgression,
  className = ''
}: PracticeGuideControlsProps) {
  const isActive = practiceState?.isActive || false

  const formatNotes = (notes: PianoNote[]): string => {
    return notes.map(note => note.note).join(', ')
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStepProgress = (): number => {
    if (!practiceState || practiceState?.totalSteps === 0) return 0
    return (practiceState?.currentStep / practiceState?.totalSteps) * 100
  }

  if (!practiceState || !practiceState.isActive) {
    // Practice setup screen
    return (
      <div className={`practice-guide-controls bg-blue-50 rounded-lg border border-blue-200 p-6 ${className}`}>
        <div className="text-center space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🎹 연습 가이드 모드
            </h3>
            <p className="text-blue-700 text-sm">
              실제 피아노에서 연습할 수 있도록 단계별 가이드를 제공합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded p-3 border border-blue-100">
              <h4 className="font-medium text-gray-900 mb-2">연습 방법</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• 강조된 건반을 실제 피아노에서 연주</li>
                <li>• 연주 후 "다음 단계" 버튼 클릭</li>
                <li>• 천천히 시작해서 점점 빨라집니다</li>
              </ul>
            </div>
            <div className="bg-white rounded p-3 border border-blue-100">
              <h4 className="font-medium text-gray-900 mb-2">설정</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600">시작 속도</label>
                  <select 
                    id="startTempo"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    defaultValue="0.5"
                  >
                    <option value="0.25">매우 느리게 (0.25x)</option>
                    <option value="0.5">느리게 (0.5x)</option>
                    <option value="0.75">보통 느림 (0.75x)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">목표 속도</label>
                  <select 
                    id="targetTempo"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    defaultValue="1.0"
                  >
                    <option value="0.75">느림 (0.75x)</option>
                    <option value="1.0">정상 (1.0x)</option>
                    <option value="1.25">빠름 (1.25x)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <Button
              onClick={() => {
                const startTempo = parseFloat((document.getElementById('startTempo') as HTMLSelectElement)?.value || '0.5')
                const targetTempo = parseFloat((document.getElementById('targetTempo') as HTMLSelectElement)?.value || '1.0')
                onStartPractice(startTempo, targetTempo)
              }}
              variant="primary"
              size="lg"
              disabled={!isReady}
              className="px-8"
            >
              🎹 연습 시작
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Active practice screen
  return (
    <div className={`practice-guide-controls bg-green-50 rounded-lg border border-green-200 p-6 ${className}`}>
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-green-900">
            연습 진행 중
          </h3>
          <span className="text-sm text-green-700">
            {practiceState.currentStep + 1} / {practiceState.totalSteps}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-3 bg-green-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-green-100">
        <div className="text-center">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            다음에 연주할 음표
          </h4>
          {practiceState.nextNotes.length > 0 ? (
            <div className="text-2xl font-mono font-bold text-green-700 bg-green-100 rounded-lg py-3 px-4 mb-3">
              {formatNotes(practiceState.nextNotes)}
            </div>
          ) : (
            <div className="text-lg text-gray-500 py-3">
              연습이 완료되었습니다!
            </div>
          )}
          
          {practiceState.nextNotes.some(note => note.finger) && (
            <div className="text-sm text-gray-600">
              손가락 번호: {practiceState.nextNotes.map(note => note.finger || '?').join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-3">
          <Button
            onClick={onNextStep}
            variant="primary"
            size="lg"
            disabled={!isReady || practiceState.currentStep >= practiceState.totalSteps}
          >
            다음 단계 →
          </Button>
          
          <Button
            onClick={onExitPractice}
            variant="outline"
            size="lg"
          >
            연습 종료
          </Button>
        </div>

        {/* Tempo Info */}
        <div className="text-right">
          <div className="text-sm text-green-700">
            현재 템포: {(practiceState.sessionStats.currentTempo * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600">
            목표: {(practiceState.sessionStats.targetTempo * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-white rounded p-3 border border-green-100">
          <div className="text-sm text-gray-600">연습 시간</div>
          <div className="text-lg font-medium text-gray-900">
            {formatTime(practiceState.sessionStats.totalTime)}
          </div>
        </div>
        <div className="bg-white rounded p-3 border border-green-100">
          <div className="text-sm text-gray-600">완료한 단계</div>
          <div className="text-lg font-medium text-gray-900">
            {practiceState.sessionStats.stepsCompleted}
          </div>
        </div>
        <div className="bg-white rounded p-3 border border-green-100">
          <div className="text-sm text-gray-600">현재 템포</div>
          <div className="text-lg font-medium text-gray-900">
            {(practiceState.sessionStats.currentTempo * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white rounded p-3 border border-green-100">
          <div className="text-sm text-gray-600">진행률</div>
          <div className="text-lg font-medium text-gray-900">
            {getStepProgress().toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Tempo Progression Toggle */}
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-blue-900">자동 템포 증가</span>
            <p className="text-xs text-blue-700">완주 후 템포가 자동으로 빨라집니다</p>
          </div>
          <button
            onClick={() => onToggleTempoProgression(true, 0.1)}
            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border border-blue-300 transition-colors"
          >
            활성화
          </button>
        </div>
      </div>
    </div>
  )
}