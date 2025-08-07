'use client'

import { Button } from '@/components/ui'

interface PlaybackControlsProps {
  isPlaying: boolean
  isReady: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  playbackMode: 'listen' | 'follow' | 'practice'
  onPlay: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onModeChange: (mode: 'listen' | 'follow' | 'practice') => void
  className?: string
}

export default function PlaybackControls({
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
  className = ''
}: PlaybackControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 
    ? (currentTime / duration) * 100 
    : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    onSeek(newTime)
  }

  return (
    <div className={`playback-controls space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div 
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
          onClick={handleProgressClick}
        >
          <div
            className="h-2 bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onPlay}
            variant="primary"
            size="lg"
            disabled={!isReady}
            className="min-w-[60px] h-12"
          >
            {isPlaying ? (
              <span className="text-xl">⏸️</span>
            ) : (
              <span className="text-xl">▶️</span>
            )}
          </Button>
          
          <Button
            onClick={onStop}
            variant="outline"
            size="lg"
            disabled={!isReady}
            className="min-w-[60px] h-12"
          >
            <span className="text-xl">⏹️</span>
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-600 font-medium">
            속도:
          </label>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
            disabled={!isReady}
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>
        </div>
      </div>

      {/* Mode Control */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-600 font-medium">
            모드:
          </label>
          <select
            value={playbackMode}
            onChange={(e) => onModeChange(e.target.value as 'listen' | 'follow' | 'practice')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
            disabled={!isReady}
          >
            <option value="listen">🎵 듣기</option>
            <option value="follow">🎹 따라하기</option>
            <option value="practice">📚 연습 가이드</option>
          </select>
        </div>

        {/* Playback Status */}
        <div className="text-sm text-gray-500">
          {!isReady ? (
            <span className="text-yellow-600">⏳ 로딩 중...</span>
          ) : isPlaying ? (
            <span className="text-green-600">▶️ 재생 중</span>
          ) : (
            <span className="text-gray-600">⏸️ 일시정지</span>
          )}
        </div>
      </div>

      {/* Follow Mode Instructions */}
      {playbackMode === 'follow' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            🎹 <strong>따라하기 모드:</strong> 피아노 건반을 눌러 연주를 따라해보세요.
          </p>
        </div>
      )}
    </div>
  )
}