'use client'

/**
 * One-row transport for a screen that is being watched rather than set up.
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
 */

export interface CompactPlaybackBarProps {
  isReady: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  volume: number
  maxVolume: number
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onVolumeChange: (volume: number) => void
  className?: string
}

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
  currentTime,
  duration,
  playbackSpeed,
  volume,
  maxVolume,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onVolumeChange,
  className = '',
}: CompactPlaybackBarProps) {
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

  return (
    <div
      data-testid="compact-playback-bar"
      className={`flex items-center gap-3 h-14 px-1 ${className}`}
    >
      <button
        type="button"
        onClick={onPause}
        disabled={!isReady}
        aria-label="일시정지"
        className="h-10 w-10 shrink-0 rounded-md border border-gray-300 bg-white text-lg leading-none hover:border-gray-400 disabled:opacity-50"
      >
        ⏸️
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={!isReady}
        aria-label="정지"
        className="h-10 w-10 shrink-0 rounded-md border border-gray-300 bg-white text-lg leading-none hover:border-gray-400 disabled:opacity-50"
      >
        ⏹️
      </button>

      {/* The two readouts are the first things to go on a narrow box: the
          transport, the seek bar and the two inputs all have to keep working
          before a number is worth a column of width. */}
      <span className="hidden shrink-0 text-xs font-mono tabular-nums text-gray-600 sm:inline">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div
        className="h-2 min-w-0 flex-1 cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

      <select
        value={playbackSpeed}
        onChange={event => onSpeedChange(parseFloat(event.target.value))}
        aria-label="재생 속도"
        className="h-10 shrink-0 rounded-md border border-gray-300 bg-white px-2 text-xs"
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
        min={0}
        max={maxVolume}
        step={0.01}
        value={volume}
        onChange={event => onVolumeChange(parseFloat(event.target.value))}
        aria-label="음량 (master gain)"
        className="w-20 shrink-0"
      />
      <span className="hidden shrink-0 w-10 text-right text-xs font-mono tabular-nums text-gray-500 sm:inline">
        {volume.toFixed(2)}
      </span>
    </div>
  )
}
