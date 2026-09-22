'use client'

import { useId } from 'react'
import { Button } from '@/components/ui'

interface PlaybackControlsProps {
  isPlaying: boolean
  isReady: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  onPlay: () => void
  onPause?: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  loopStart?: number | null
  loopEnd?: number | null
  onLoopStart?: () => void
  onLoopEnd?: () => void
  onLoopClear?: () => void
  className?: string
}

export default function PlaybackControls({
  isPlaying,
  isReady,
  currentTime,
  duration,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  loopStart = null,
  loopEnd = null,
  onLoopStart,
  onLoopEnd,
  onLoopClear,
  className = ''
}: PlaybackControlsProps) {
  /**
   * 고정 문자열 id를 쓰면 한 문서에 두 인스턴스가 있을 때 두 번째 레이블이
   * 첫 번째 속도 선택을 가리킨다.
   */
  const instanceId = useId()
  const speedSelectId = `${instanceId}-speed`

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          data-testid="playback-primary-controls"
          className="grid min-w-0 grid-cols-3 items-center gap-2 md:flex md:gap-3"
        >
          {/* Play Button */}
          <Button
            onClick={onPlay}
            variant="primary"
            size="lg"
            disabled={!isReady || isPlaying}
            className="h-12 w-20 gap-1 p-0 !px-0 !py-0 text-xs"
            aria-label="재생"
            data-testid="playback-play"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="m8 5 11 7-11 7V5Z" /></svg>
            <span>재생</span>
          </Button>
          
          {/* Pause Button */}
          <Button
            onClick={onPause || onPlay}
            variant="outline"
            size="lg"
            disabled={!isReady || !isPlaying}
            className="h-12 w-20 gap-1 p-0 !px-0 !py-0 text-xs"
            aria-label="일시정지"
            data-testid="playback-pause"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M7 5h3v14H7zm7 0h3v14h-3z" /></svg>
            <span>일시정지</span>
          </Button>
          
          {/* Stop Button */}
          <Button
            onClick={onStop}
            variant="outline"
            size="lg"
            disabled={!isReady}
            className="h-12 w-20 gap-1 p-0 !px-0 !py-0 text-xs"
            aria-label="중지"
            data-testid="playback-stop"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            <span>중지</span>
          </Button>

          {onLoopStart && onLoopEnd && onLoopClear && (
            <div className="col-span-3 grid grid-cols-3 items-center gap-1 rounded-full border border-rule bg-surface-muted p-1 md:flex" data-testid="playback-loop">
              <Button onClick={onLoopStart} variant="outline" size="lg" disabled={!isReady || duration <= 0} className="h-12 w-20 p-0 !px-0 !py-0 border-hand-left text-hand-left text-xs" title="구간 시작 A 설정" aria-label="A 시작">A 시작</Button>
              <Button onClick={onLoopEnd} variant="outline" size="lg" disabled={!isReady || duration <= 0 || loopStart === null} className="h-12 w-20 p-0 !px-0 !py-0 border-hand-right text-hand-right text-xs" title="구간 끝 B 설정" aria-label="B 종료">B 종료</Button>
              <Button onClick={onLoopClear} variant={loopEnd !== null ? 'primary' : 'ghost'} size="lg" disabled={!isReady || loopStart === null} className="h-12 w-20 gap-1 p-0 !px-0 !py-0 text-xs" title="A-B 구간 반복 초기화" aria-label="A-B 구간 반복 초기화">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>
                <span>초기화</span>
              </Button>
            </div>
          )}
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-3">
          <label htmlFor={speedSelectId} className="text-sm text-ink-muted font-medium">
            속도:
          </label>
          <div className="relative">
            <select
              id={speedSelectId}
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="h-12 min-w-[104px] appearance-none rounded-full border border-rule-strong bg-surface pl-4 pr-9 text-sm text-ink shadow-sm transition-colors hover:bg-surface-muted"
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
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-current text-ink-muted">
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
      {onLoopStart && onLoopEnd && (
        <p className="text-xs text-ink-muted">
          구간 반복: A(시작) {loopStart === null ? '미설정' : formatTime(loopStart)} · B(종료) {loopEnd === null ? '미설정' : formatTime(loopEnd)}
        </p>
      )}


    </div>
  )
}
