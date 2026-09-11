'use client'

import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui'

/**
 * Compact transport for an active practice session.
 *
 * `PlaybackControls` stacks three rows and costs 152px, and the player adds an
 * instruction line, a sample-status line and a volume row on top of it — 264px
 * in total. An iPhone 12 in landscape has 390px of viewport height, so those
 * rows and the falling notes cannot both exist. This bar keeps only what is
 * still useful once the score is sounding: a transport, a seekable position, a
 * tempo, and the gain.
 *
 * The mode selector is deliberately absent. `FallingNotesPlayer` only supports
 * listen mode, and its handler logs rather than switching, so the control has
 * nothing to offer here.
 *
 * The bar outlives a pause. It is the transport for a practice session, not for
 * a sounding score, so the first control toggles between pause and resume in
 * place rather than the bar being swapped out for the setup chrome.
 */

export interface CompactPlaybackBarProps {
  isReady: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  volume: number
  maxVolume: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onVolumeChange: (volume: number) => void
  loopStart?: number | null
  loopEnd?: number | null
  onLoopStart?: () => void
  onLoopEnd?: () => void
  onLoopClear?: () => void
  className?: string
}

const NARROW_DESKTOP_QUERY = '(max-width: 639px) and (pointer: fine)'
const isNarrowDesktop = () => typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' && window.matchMedia(NARROW_DESKTOP_QUERY).matches
const serverSnapshot = () => false

const SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const SEEK_STEP_SEC = 5

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function CompactPlaybackBar({
  isReady,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  volume,
  maxVolume,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onVolumeChange,
  loopStart = null,
  loopEnd = null,
  onLoopStart,
  onLoopEnd,
  onLoopClear,
  className = '',
}: CompactPlaybackBarProps) {
  const seekRef = useRef<HTMLDivElement>(null)
  const restoreSeekFocus = useRef(false)
  const subscribeToLayout = useCallback((onChange: () => void) => {
    if (typeof window.matchMedia !== 'function') return () => {}
    const query = window.matchMedia(NARROW_DESKTOP_QUERY)
    const handleChange = () => {
      // Capture focus before React moves the control to its new reading order.
      restoreSeekFocus.current = document.activeElement === seekRef.current
      onChange()
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])
  const narrowDesktop = useSyncExternalStore(subscribeToLayout, isNarrowDesktop, serverSnapshot)
  useLayoutEffect(() => {
    if (restoreSeekFocus.current) seekRef.current?.focus({ preventScroll: true })
    restoreSeekFocus.current = false
  }, [narrowDesktop])
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  const clamp = (time: number) => Math.min(duration, Math.max(0, time))

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    onSeek(clamp(((event.clientX - rect.left) / rect.width) * duration))
  }

  /**
   * The playhead is a slider, not decoration, so a keyboard has to be able to
   * move it. It is not an `input[type=range]`: React fires that element's
   * onChange on every drag step, and each seek here restarts the audio from the
   * new position. Discrete key steps commit one seek apiece.
   */
  const handleSeekKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 1 : SEEK_STEP_SEC
    const next = {
      ArrowRight: () => currentTime + step,
      ArrowUp: () => currentTime + step,
      ArrowLeft: () => currentTime - step,
      ArrowDown: () => currentTime - step,
      Home: () => 0,
      End: () => duration,
    }[event.key]

    if (!next) return
    event.preventDefault()
    onSeek(clamp(next()))
  }

  const seekControl = (
    <div
      ref={seekRef}
      className="compact-playback-seek h-2 min-w-0 flex-1 cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      onClick={handleSeek}
      onKeyDown={handleSeekKey}
      role="slider"
      tabIndex={0}
      aria-label="재생 위치"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
    >
      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
    </div>
  )

  return (
    <div
      data-testid="compact-playback-bar"
      className={`compact-playback-bar flex items-center gap-3 h-14 px-1 ${className}`}
    >
      {/* One slot, two states. A pause used to replace this bar with the
          three-row setup block, so resuming meant finding the transport
          somewhere else on a page that had reflowed in the meantime. */}
      <Button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        disabled={!isReady}
        aria-label={isPlaying ? '일시정지' : '재생'}
        variant="outline"
        size="md"
        className="compact-playback-transport h-10 w-10 shrink-0 p-0 !px-0 !py-0 text-lg leading-none"
      >
        {isPlaying ? '⏸️' : '▶️'}
      </Button>
      {onLoopStart && onLoopEnd && onLoopClear && (
        <div className="compact-playback-loop flex shrink-0 gap-1" data-testid="compact-loop-controls">
          <Button type="button" onClick={onLoopStart} disabled={!isReady} variant="outline" size="sm" className="h-10 w-10 p-0 !px-0 !py-0 border-hand-left text-xs text-hand-left" title="구간 시작 A 설정" aria-label="구간 시작 A 설정">A</Button>
          <Button type="button" onClick={onLoopEnd} disabled={!isReady || loopStart === null} variant="outline" size="sm" className="h-10 w-10 p-0 !px-0 !py-0 border-hand-right text-xs text-hand-right" title="구간 끝 B 설정" aria-label="구간 끝 B 설정">B</Button>
          <Button type="button" onClick={onLoopClear} disabled={!isReady || loopStart === null} variant={loopEnd !== null ? 'primary' : 'ghost'} size="sm" className="h-10 w-10 p-0 !px-0 !py-0 text-xs" aria-label="A-B 구간 반복 초기화" title="A-B 구간 반복 초기화">↻</Button>
        </div>
      )}
      <Button
        type="button"
        onClick={onStop}
        disabled={!isReady}
        aria-label="정지"
        variant="outline"
        size="md"
        className="compact-playback-stop h-10 w-10 shrink-0 p-0 text-lg leading-none"
      >
        ⏹️
      </Button>

      {/* The two readouts are the first things to go on a narrow box: the
          transport, the seek bar and the two inputs all have to keep working
          before a number is worth a column of width. */}
      <span className="hidden shrink-0 text-xs font-mono tabular-nums text-ink-muted sm:inline">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {!narrowDesktop && seekControl}

      {/* Disabled while the samples load, exactly as the setup screen's speed
          control is. During playback this is always enabled — the status has
          resolved before a note sounds — so the only window it closes is a
          resume that is still starting, where a speed change would cancel the
          start the reader just asked for. */}
      <select
        value={playbackSpeed}
        onChange={event => onSpeedChange(parseFloat(event.target.value))}
        disabled={!isReady}
        aria-label="재생 속도"
        className="compact-playback-speed h-10 shrink-0 rounded-full border border-rule-strong bg-surface px-3 text-xs text-ink shadow-sm disabled:opacity-50"
      >
        {SPEEDS.map(speed => (
          <option key={speed} value={speed}>
            {speed}x
          </option>
        ))}
      </select>

      {/* The readout is the gain value itself, which is what makes this usable
          for choosing DEFAULT_MASTER_GAIN by ear during playback. */}
      <input
        type="range"
        tabIndex={0}
        min={0}
        max={maxVolume}
        step={0.01}
        value={volume}
        onChange={event => onVolumeChange(parseFloat(event.target.value))}
        aria-label="음량 (master gain)"
        className="compact-playback-volume w-20 shrink-0"
      />
      <span className="hidden shrink-0 w-10 text-right text-xs font-mono tabular-nums text-ink-muted sm:inline">
        {volume.toFixed(2)}
      </span>
      {/* DOM order follows the second seek row only in the matching layout. */}
      {narrowDesktop && seekControl}
    </div>
  )
}
