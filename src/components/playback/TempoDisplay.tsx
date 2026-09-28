import type { TempoDisplayInput } from '@/types/animationContract'
import { getTempoDisplay } from '@/utils/tempoDisplay'
import type { ReactNode } from 'react'

export interface TempoDisplayProps extends TempoDisplayInput {
  isPlaybackActive?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Shows the recorded tempo and whether it came from the score or the user.
 *
 * During playback it is one small line in the page flow, never an overlay
 * (issue #186). A phone held upright rotates the player with a transform, and a
 * transformed ancestor becomes the containing block of anything `fixed` inside
 * it, so the old fixed pill landed on the falling-note lane. The caller places
 * the line outside the lane; the lane's measured wrapper absorbs its height.
 */
export default function TempoDisplay({
  isPlaybackActive = false,
  className = '',
  children,
  ...input
}: TempoDisplayProps) {
  const display = getTempoDisplay(input)

  return (
    <div
      data-testid="tempo-display"
      aria-label={`메트로놈: ${display.primary}`}
      className={[
        'font-medium text-gray-700',
        isPlaybackActive ? 'px-1 pb-1 text-xs leading-4' : 'text-sm',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span>{display.primary}</span>
      {display.secondary && (
        <span className="ml-2 text-xs font-normal text-ink-muted">{display.secondary}</span>
      )}
      {children}
    </div>
  )
}
