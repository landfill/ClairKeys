'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import PlaybackControls from './PlaybackControls'

interface AdvancedPlaybackControlsProps {
  isPlaying: boolean
  isReady: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  playbackMode: 'listen' | 'follow'
  onPlay: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onModeChange: (mode: 'listen' | 'follow') => void
  // Advanced features
  onLoop?: (enabled: boolean) => void
  onRewind?: () => void
  onFastForward?: () => void
  onSkipBackward?: () => void
  onSkipForward?: () => void
  isLooping?: boolean
  className?: string
}

export default function AdvancedPlaybackControls({
  isPlaying,
  isReady,
  currentTime,
  duration,
  playbackSpeed,
  playbackMode,
  onPlay,
  onStop,
  onSeek,
  onSpeedChange,
  onModeChange,
  onLoop,
  onRewind,
  onFastForward,
  onSkipBackward,
  onSkipForward,
  isLooping = false,
  className = ''
}: AdvancedPlaybackControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - 10) // 10초 뒤로
    onSeek(newTime)
    onSkipBackward?.()
  }

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 10) // 10초 앞으로
    onSeek(newTime)
    onSkipForward?.()
  }

  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 30) // 30초 뒤로
    onSeek(newTime)
    onRewind?.()
  }

  const handleFastForward = () => {
    const newTime = Math.min(duration, currentTime + 30) // 30초 앞으로
    onSeek(newTime)
    onFastForward?.()
  }

  return (
    <div className={`advanced-playback-controls space-y-4 ${className}`}>
      {/* 기본 재생 컨트롤 */}
      <PlaybackControls
        isPlaying={isPlaying}
        isReady={isReady}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        playbackMode={playbackMode}
        onPlay={onPlay}
        onStop={onStop}
        onSeek={onSeek}
        onSpeedChange={onSpeedChange}
        onModeChange={onModeChange}
      />

      {/* 고급 컨트롤 토글 */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs"
        >
          {showAdvanced ? '▲ 간단히 보기' : '▼ 고급 컨트롤'}
        </Button>
      </div>

      {/* 고급 컨트롤 */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Skip 컨트롤 */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRewind}
              disabled={!isReady}
              title="30초 되감기"
              className="px-3"
            >
              ⏪ 30s
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipBackward}
              disabled={!isReady}
              title="10초 되감기"
              className="px-3"
            >
              ⏮ 10s
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipForward}
              disabled={!isReady}
              title="10초 빨리감기"
              className="px-3"
            >
              10s ⏭
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleFastForward}
              disabled={!isReady}
              title="30초 빨리감기"
              className="px-3"
            >
              30s ⏩
            </Button>
          </div>

          {/* 반복 재생 및 추가 옵션 */}
          <div className="flex items-center justify-between">
            {onLoop && (
              <div className="flex items-center space-x-2">
                <input
                  id="loop-checkbox"
                  type="checkbox"
                  checked={isLooping}
                  onChange={(e) => onLoop(e.target.checked)}
                  disabled={!isReady}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label 
                  htmlFor="loop-checkbox" 
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  🔄 반복 재생
                </label>
              </div>
            )}

            {/* 키보드 단축키 안내 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('키보드 단축키:\n스페이스바: 재생/일시정지\n← →: 10초 이동\n↑ ↓: 속도 조절')}
              className="text-xs"
            >
              ⌨️ 단축키
            </Button>
          </div>

          {/* 세밀한 속도 조절 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600 font-medium">
              정밀 속도 조절
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">0.25x</span>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                disabled={!isReady}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-500">2.0x</span>
              <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                {playbackSpeed.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* A-B 반복 구간 설정 (미래 기능) */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                🔄 A-B 구간 반복 (개발 예정)
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs"
              >
                설정
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}