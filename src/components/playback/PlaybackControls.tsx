'use client'

import { useId } from 'react'
import { Button } from '@/components/ui'

interface PlaybackControlsProps {
  isPlaying: boolean
  isReady: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  playbackMode: 'listen' | 'follow' | 'practice'
  onPlay: () => void
  onPause?: () => void
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
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onModeChange,
  className = ''
}: PlaybackControlsProps) {
  /**
   * 고정 문자열 id를 쓰면 한 문서에 두 인스턴스가 있을 때 id가 겹치고, 두 번째 `<label>`이 첫 번째
   * `<select>`를 가리킨다. `AnimationPlayer`와 `AdvancedPlaybackControls`가 각각 이 컴포넌트를
   * 렌더하므로 실제로 가능한 조합이다.
   */
  const instanceId = useId()
  const speedSelectId = `${instanceId}-speed`
  const modeSelectId = `${instanceId}-mode`

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

  const clampToPiece = (time: number) => Math.min(Math.max(time, 0), duration)

  const SEEK_STEP_SEC = 1
  const SEEK_PAGE_SEC = 5

  /**
   * seek 바는 `onClick`만 달린 `div`라 마우스로만 조작할 수 있었다 (WCAG 2.1.1). axe는 이런
   * 마우스 전용 인터랙션을 잡지 못한다 — 정적으로는 `div`에 핸들러가 붙었는지 알 수 없다.
   * 슬라이더의 관례적인 키 조작을 그대로 따른다.
   */
  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const move: Record<string, number | undefined> = {
      ArrowRight: currentTime + SEEK_STEP_SEC,
      ArrowUp: currentTime + SEEK_STEP_SEC,
      ArrowLeft: currentTime - SEEK_STEP_SEC,
      ArrowDown: currentTime - SEEK_STEP_SEC,
      PageUp: currentTime + SEEK_PAGE_SEC,
      PageDown: currentTime - SEEK_PAGE_SEC,
      Home: 0,
      End: duration,
    }

    const target = move[e.key]
    if (target === undefined) return

    e.preventDefault()
    onSeek(clampToPiece(target))
  }

  return (
    <div className={`playback-controls space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-sm text-ink-muted mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          tabIndex={duration > 0 ? 0 : -1}
          className="w-full h-2 bg-rule rounded-full cursor-pointer hover:brightness-95 transition-colors"
          onClick={handleProgressClick}
          onKeyDown={handleProgressKeyDown}
        >
          <div
            className="h-2 bg-accent rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Play Button */}
          <Button
            onClick={onPlay}
            variant="primary"
            size="lg"
            disabled={!isReady || isPlaying}
            className="min-w-[60px] h-12"
          >
            <span className="text-xl">▶️</span>
          </Button>
          
          {/* Pause Button */}
          <Button
            onClick={onPause || onPlay}
            variant="outline"
            size="lg"
            disabled={!isReady || !isPlaying}
            className="min-w-[60px] h-12"
          >
            <span className="text-xl">⏸️</span>
          </Button>
          
          {/* Stop Button */}
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
          <label htmlFor={speedSelectId} className="text-sm text-ink-muted font-medium">
            속도:
          </label>
          <select
            id={speedSelectId}
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="px-3 py-2 border border-rule-strong rounded-md text-sm bg-surface text-ink transition-colors"
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
          <label htmlFor={modeSelectId} className="text-sm text-ink-muted font-medium">
            모드:
          </label>
          <select
            id={modeSelectId}
            value={playbackMode}
            onChange={(e) => onModeChange(e.target.value as 'listen' | 'follow' | 'practice')}
            className="px-3 py-2 border border-rule-strong rounded-md text-sm bg-surface text-ink transition-colors"
            disabled={!isReady}
          >
            <option value="listen">🎵 듣기</option>
            <option value="follow">🎹 따라하기</option>
            <option value="practice">📚 연습 가이드</option>
          </select>
        </div>

        <div className="text-sm text-ink-muted">
          {!isReady ? (
            <span className="text-state-progress">
              <span>⏳ </span>로딩 중...
            </span>
          ) : isPlaying ? (
            <span className="text-state-ready">
              <span>▶️ </span>재생 중
            </span>
          ) : (
            <span className="text-ink-muted">
              <span>⏸️ </span>일시정지
            </span>
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